import http from "node:http";
import app from "../server";
import { httpServerHandler } from "cloudflare:node";
import {
  reconfigureDatabase,
  isDatabaseConfigured,
  isSchemaEnsured,
  ensureDatabaseSchema,
} from "./db";
import { setWorkerR2Bucket } from "./storage";
import { validateWorkerProductionLifecycle } from "./envValidation";
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

function syncWorkerBindings(env: CloudflareEnv): string {
  // 1. Populate process.env for Node.js modules reading non-binding string vars
  if (env && typeof process !== "undefined" && process.env) {
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === "string") {
        process.env[key] = value;
      }
    }
  }

  // 2. Bind Cloudflare R2 bucket for persistent object storage
  if (env?.R2_BUCKET) {
    setWorkerR2Bucket(env.R2_BUCKET);
  }

  // 3. Reconfigure Database ONLY if connection string changed
  const activeConn = (env?.HYPERDRIVE?.connectionString || env?.DATABASE_URL || "").trim();
  if (activeConn) {
    reconfigureDatabase(activeConn, true);
  }
  return activeConn;
}

export default {
  /**
   * Main fetch handler for incoming HTTP/HTTPS requests
   */
  async fetch(request: Request, env: CloudflareEnv, ctx: any): Promise<Response> {
    syncWorkerBindings(env);

    // Validate production environment presence (never logs secret values)
    const envReport = validateWorkerProductionLifecycle(env as unknown as Record<string, any>);
    const url = new URL(request.url);

    // Fail closed on API requests in production if required bindings/secrets or database are missing
    if (url.pathname.startsWith("/api") && envReport.isProduction) {
      if (!isDatabaseConfigured || envReport.errors.length > 0) {
        return new Response(
          JSON.stringify({
            error: "Service configuration unavailable",
            message: !isDatabaseConfigured
              ? "Production database connection is required. Verify Cloudflare Hyperdrive or DATABASE_URL configuration."
              : "Production environment validation failed. Required secrets or bindings are missing.",
            missingOrInvalid: envReport.errors,
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Ensure database schema at most once per isolate lifecycle (safe under concurrent requests)
    if (isDatabaseConfigured && !isSchemaEnsured()) {
      const schemaTask = ensureDatabaseSchema().catch(() => {});
      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(schemaTask);
      }
    }

    // Handle static assets via Cloudflare Workers Static Assets binding if present
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

    // Delegate to Express API handler via cloudflare:node
    return nodeHttpHandler.fetch(request, env, ctx);
  },

  /**
   * Cloudflare Workers Cron Triggers handler replacing traditional server daemons
   */
  async scheduled(event: { cron: string; scheduledTime: number }, env: CloudflareEnv, ctx: any): Promise<void> {
    syncWorkerBindings(env);
    const envReport = validateWorkerProductionLifecycle(env as unknown as Record<string, any>);
    if (envReport.isProduction && (!isDatabaseConfigured || envReport.errors.length > 0)) {
      console.error("[CF WORKER CRON ABORTED] Production environment validation failed:", envReport.errors.join(" | "));
      return;
    }

    console.log(`[CF WORKER CRON] Executing scheduled task for pattern: '${event.cron}' at ${new Date(event.scheduledTime).toISOString()}`);

    const runCron = async () => {
      try {
        if (isDatabaseConfigured && !isSchemaEnsured()) {
          await ensureDatabaseSchema();
        }
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
          await runDealExpirationCheck();
        }
      } catch (err: any) {
        console.error(`[CF WORKER CRON ERROR] ${event.cron} execution failed:`, err?.message || err);
      }
    };
    const taskPromise = runCron();

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
