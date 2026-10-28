import app from "../../server.js";
import type { Request, Response } from "express";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: Request, res: Response): Promise<void> {
  const rawUrl = req.url || (req as any).originalUrl || "";
  const qIdx = rawUrl.indexOf("?");
  const query = qIdx !== -1 ? rawUrl.slice(qIdx) : "";
  req.url = `/api/instagram/callback${query}`;
  (req as any).originalUrl = req.url;

  return new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    res.once("finish", finish);
    res.once("close", finish);

    try {
      app(req, res, (err: any) => {
        if (err) {
          console.error("[VERCEL CALLBACK HANDLER ERROR]", err?.message || err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Internal Server Error in Instagram OAuth callback" });
          }
        }
        finish();
      });
    } catch (syncErr: any) {
      console.error("[VERCEL CALLBACK SYNC EXCEPTION]", syncErr?.message || syncErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Serverless exception in Instagram OAuth callback" });
      }
      finish();
    }
  });
}

