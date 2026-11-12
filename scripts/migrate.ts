import "dotenv/config";
import pg from "pg";
import { runDatabaseMigrations, pool, isDatabaseConfigured } from "../server/db";

async function main() {
  const cliUrl = process.argv[2]?.trim();
  const targetUrl = cliUrl || process.env.DATABASE_URL;

  if (!targetUrl) {
    console.error("================================================================================");
    console.error("[DB MIGRATE] Error: No database URL provided.");
    console.error("Please set DATABASE_URL in your environment or provide it directly:");
    console.error("  npm run db:migrate");
    console.error("  npx tsx scripts/migrate.ts <database_url>");
    console.error("================================================================================");
    process.exit(1);
  }

  let customPool: pg.Pool | null = null;
  try {
    console.log("[DB MIGRATE] Starting canonical clean launch schema migration...");
    if (cliUrl) {
      console.log("[DB MIGRATE] Connecting to target PostgreSQL database provided via CLI argument...");
      customPool = new pg.Pool({
        connectionString: cliUrl,
        ssl: (cliUrl.includes("localhost") || cliUrl.includes("127.0.0.1")) ? undefined : { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });
      const client = await customPool.connect();
      try {
        await runDatabaseMigrations(client);
      } finally {
        client.release();
      }
    } else {
      if (!isDatabaseConfigured) {
        console.error("[DB MIGRATE] Error: DATABASE_URL is not configured.");
        process.exit(1);
      }
      await runDatabaseMigrations();
    }
    console.log("[DB MIGRATE] ✓ Canonical 34-table migration applied and tracked successfully.");
    if (customPool) await customPool.end();
    else await pool.end();
    process.exit(0);
  } catch (err: any) {
    console.error("[DB MIGRATE] Migration failed:", err?.message || err);
    if (customPool) {
      try { await customPool.end(); } catch {}
    } else {
      try { await pool.end(); } catch {}
    }
    process.exit(1);
  }
}

main();
