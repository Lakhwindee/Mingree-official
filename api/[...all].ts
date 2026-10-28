import app from "../server";
import type { Request, Response } from "express";

export default function handler(req: Request, res: Response) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error("[VERCEL SERVERLESS HANDLER ERROR]", err?.message || err);
    if (!res.headersSent) {
      if (req.url && (req.url.includes("instagram") || req.url.includes("callback"))) {
        res.status(200).send(`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <title>Instagram Authentication</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
                .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 36px 28px; text-align: center; max-width: 420px; width: 100%; }
                h1 { font-size: 20px; margin-bottom: 12px; }
                p { font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
                button { background: #3b82f6; color: white; border: none; padding: 10px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>Instagram Authentication Received</h1>
                <p>Your authentication request was processed. You can return to Mingree.</p>
                <button onclick="finish()">Return to Mingree</button>
              </div>
              <script>
                function finish() {
                  if (window.opener) {
                    try { window.opener.postMessage({ type: 'INSTAGRAM_OAUTH_SUCCESS' }, '*'); } catch(e) {}
                    try { window.close(); } catch(e) {}
                  }
                  window.location.href = '/profile';
                }
                setTimeout(finish, 1800);
              </script>
            </body>
          </html>
        `);
      } else {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  }
}
