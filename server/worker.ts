import http from "node:http";
import app from "../server";
import { httpServerHandler } from "cloudflare:node";
import { reconfigureDatabase, isDatabaseConfigured, runWithWorkerDbUrl } from "./db";
import { setWorkerR2Bucket } from "./storage";
import {
  runDealExpirationCheck,
  runAutoApproveEngine,
  runFinalReleaseEngine,
  runDailyMaintenanceJobs,
  runSnapshotJobs,
} from "./cronJobs";

// Create http server from Express app and bind to virtual port 3000
const server = http.createServer(app);
server.listen(3000);

// Initialize Cloudflare node HTTP server handler adapter for Express
const nodeHttpHandler = httpServerHandler({ port: 3000 });

export default {
  /**
   * Main fetch handler for incoming HTTP/HTTPS requests
   */
  async fetch(request: Request, env: CloudflareEnv, ctx: any): Promise<Response> {
    // 1. Reconfigure Database using Cloudflare Hyperdrive or direct connection string
    if (env.HYPERDRIVE?.connectionString) {
      reconfigureDatabase(env.HYPERDRIVE.connectionString);
    } else if (env.DATABASE_URL) {
      reconfigureDatabase(env.DATABASE_URL);
    }

    // 2. Set Cloudflare R2 bucket binding for zero-cost persistent object storage
    if (env.R2_BUCKET) {
      setWorkerR2Bucket(env.R2_BUCKET);
    }

    // 3. Populate process.env for Node.js modules reading config
    if (env && typeof process !== "undefined" && process.env) {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string") {
          process.env[key] = value;
        }
      }
    }

    const url = new URL(request.url);

    // 4. In production, fail-fast on API requests if database is unconfigured
    if (url.pathname.startsWith("/api") && process.env.NODE_ENV === "production" && !isDatabaseConfigured) {
      return new Response(
        JSON.stringify({
          error: "Database offline",
          message: "Production database connection is required. Verify Cloudflare Hyperdrive or DATABASE_URL configuration.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Handle static assets via Cloudflare Workers Static Assets binding if present
    if (!url.pathname.startsWith("/api") && env.ASSETS && typeof env.ASSETS.fetch === "function") {
      try {
        const fetchTargetUrl = url.pathname === "/index.html" ? new URL("/", request.url) : new URL(request.url);
        const assetResponse = await env.ASSETS.fetch(new Request(fetchTargetUrl.toString(), request));
        if (assetResponse.status >= 200 && assetResponse.status < 400) {
          const contentType = assetResponse.headers.get("content-type") || "";
          if (contentType.includes("text/html")) {
            const headers = new Headers(assetResponse.headers);
            headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
            return new Response(assetResponse.body, { status: assetResponse.status, headers });
          }
          return assetResponse;
        }

        // SPA fallback: return root index.html for client-side HTML routes
        const acceptHeader = request.headers.get("accept") || "";
        if (request.method === "GET" && (acceptHeader.includes("text/html") || !pathHasExtension(url.pathname))) {
          const rootUrl = new URL("/", request.url);
          const indexResponse = await env.ASSETS.fetch(
            new Request(rootUrl.toString(), { method: "GET", headers: request.headers })
          );
          if (indexResponse.status === 200) {
            const headers = new Headers(indexResponse.headers);
            headers.set("Content-Type", "text/html; charset=utf-8");
            headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
            return new Response(indexResponse.body, { status: 200, headers });
          }
        }
      } catch (assetErr) {
        console.warn("[CF ASSETS] Fallback to Express handler:", assetErr);
      }
    }

    // 6. Delegate to Express API handler via cloudflare:node with per-request DB binding
    const activeConn = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
    if (activeConn) {
      return runWithWorkerDbUrl(activeConn, () => nodeHttpHandler.fetch(request, env, ctx));
    }
    return nodeHttpHandler.fetch(request, env, ctx);
  },

  /**
   * Cloudflare Workers Cron Triggers handler replacing traditional server daemons
   */
  async scheduled(event: { cron: string; scheduledTime: number }, env: CloudflareEnv, ctx: any): Promise<void> {
    if (env.HYPERDRIVE?.connectionString) {
      reconfigureDatabase(env.HYPERDRIVE.connectionString);
    } else if (env.DATABASE_URL) {
      reconfigureDatabase(env.DATABASE_URL);
    }

    console.log(`[CF WORKER CRON] Executing scheduled task for pattern: '${event.cron}' at ${new Date(event.scheduledTime).toISOString()}`);

    const activeCronConn = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || "";
    const runCron = async () => {
      try {
        if (event.cron === "*/5 * * * *") {
          const result = await runDealExpirationCheck();
          console.log(`[CF WORKER CRON 5m] Deal expiration checked: ${result.expiredCount} expired, ${result.warningsSent} warnings.`);
        } else if (event.cron === "*/15 * * * *") {
          const result = await runAutoApproveEngine();
          console.log(`[CF WORKER CRON 15m] Auto-approval engine processed: ${result.autoApprovedCount} approved.`);
        } else if (event.cron === "0 * * * *") {
          const result = await runSnapshotJobs();
          console.log(`[CF WORKER CRON 1h] Metric snapshots taken: ${result.snapshotsCount} snapshots.`);
        } else if (event.cron === "0 0 * * *") {
          const releaseResult = await runFinalReleaseEngine();
          const maintResult = await runDailyMaintenanceJobs();
          console.log(`[CF WORKER CRON Daily] Released: ${releaseResult.releasedCount}, Refunded: ${releaseResult.refundedCount}, Maintained: ${maintResult.metricsRefreshed} metrics.`);
        } else {
          // Default fallback task
          await runDealExpirationCheck();
        }
      } catch (err: any) {
        console.error(`[CF WORKER CRON ERROR] ${event.cron} execution failed:`, err?.message || err);
      }
    };
    const taskPromise = activeCronConn ? runWithWorkerDbUrl(activeCronConn, runCron) : runCron();

    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(taskPromise);
    } else {
      await taskPromise;
    }
  },
};

function pathHasExtension(pathname: string): boolean {
  const lastSlash = pathname.lastIndexOf("/");
  const lastDot = pathname.lastIndexOf(".");
  return lastDot > lastSlash && lastDot !== -1;
}
