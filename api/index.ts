import app from "../server.js";
import type { Request, Response } from "express";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: Request, res: Response): Promise<void> {
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
          console.error("[EXPRESS UNHANDLED ERROR IN VERCEL]", err?.message || err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Internal Server Error" });
          }
        }
        finish();
      });
    } catch (syncErr: any) {
      console.error("[VERCEL HANDLER SYNC EXCEPTION]", syncErr?.message || syncErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error" });
      }
      finish();
    }
  });
}

