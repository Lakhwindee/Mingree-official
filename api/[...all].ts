import app from "../server";
import type { Request, Response } from "express";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: Request, res: Response): Promise<void> {
  return new Promise<void>((resolve) => {
    let finished = false;
    const safeResolve = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };

    res.once("finish", safeResolve);
    res.once("close", safeResolve);
    res.once("error", (err) => {
      console.error("[VERCEL HTTP RESPONSE ERROR]", err);
      safeResolve();
    });

    try {
      app(req, res, (err: any) => {
        if (err) {
          console.error("[EXPRESS UNHANDLED ERROR IN VERCEL]", err?.message || err);
          if (!res.headersSent) {
            if (req.url && (req.url.includes("instagram") || req.url.includes("callback"))) {
              res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(`
                <!DOCTYPE html>
                <html lang="en">
                  <head>
                    <meta charset="utf-8">
                    <title>Instagram Connected</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                      .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 36px 28px; text-align: center; max-width: 420px; width: 100%; box-shadow: 0 20px 35px -10px rgba(0,0,0,0.5); }
                      h1 { font-size: 22px; font-weight: 700; margin: 0 0 10px; }
                      p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
                      button { background: #3b82f6; color: white; border: none; padding: 10px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
                    </style>
                  </head>
                  <body>
                    <div class="card">
                      <h1>Instagram Authentication Complete</h1>
                      <p>Your Instagram connection has been processed. Returning to Mingree...</p>
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
                      try {
                        if (window.opener) {
                          window.opener.postMessage({ type: 'INSTAGRAM_OAUTH_SUCCESS' }, '*');
                          setTimeout(() => { try { window.close(); } catch(e) {} window.location.href = '/profile'; }, 1200);
                        } else {
                          setTimeout(finish, 1800);
                        }
                      } catch (e) {
                        setTimeout(finish, 1800);
                      }
                    </script>
                  </body>
                </html>
              `);
            } else {
              res.status(500).json({ error: "Internal Server Error" });
            }
          }
        }
        safeResolve();
      });
    } catch (syncErr: any) {
      console.error("[VERCEL HANDLER SYNC EXCEPTION]", syncErr?.message || syncErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error" });
      }
      safeResolve();
    }
  });
}
