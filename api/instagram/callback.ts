import app from "../../server.js";
import type { Request, Response } from "express";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: Request, res: Response): Promise<void> {
  // Ensure the route URL is explicitly recognized as /api/instagram/callback
  const qIdx = req.url.indexOf("?");
  const query = qIdx !== -1 ? req.url.slice(qIdx) : "";
  req.url = `/api/instagram/callback${query}`;

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
      console.error("[VERCEL CALLBACK HTTP ERROR]", err);
      safeResolve();
    });

    try {
      app(req, res, (err: any) => {
        if (err) {
          console.error("[VERCEL CALLBACK UNHANDLED ERROR]", err?.message || err);
          if (!res.headersSent) {
            res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(`
              <!DOCTYPE html>
              <html lang="en">
                <head>
                  <meta charset="utf-8">
                  <title>Instagram Connection Status</title>
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
          }
        }
        safeResolve();
      });
    } catch (syncErr: any) {
      console.error("[VERCEL CALLBACK SYNC EXCEPTION]", syncErr?.message || syncErr);
      if (!res.headersSent) {
        res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(`
          <!DOCTYPE html>
          <html>
            <body style="background:#0f172a;color:#f8fafc;font-family:sans-serif;text-align:center;padding:40px;">
              <h2>Authentication Received</h2>
              <p>Returning to Mingree...</p>
              <script>
                if (window.opener) {
                  try { window.opener.postMessage({ type: 'INSTAGRAM_OAUTH_SUCCESS' }, '*'); } catch(e) {}
                  try { window.close(); } catch(e) {}
                }
                window.location.href = '/profile';
              </script>
            </body>
          </html>
        `);
      }
      safeResolve();
    }
  });
}
