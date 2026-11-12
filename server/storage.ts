import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";
import fs from "fs";

interface UploadOptions {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder?: string;
}

export interface UploadResult {
  success: boolean;
  url: string;
  fileName: string;
  size: number;
  storageProvider: "r2" | "vercel_blob" | "local";
}

let activeR2BucketBinding: any = null;

export function setWorkerR2Bucket(binding: any): void {
  activeR2BucketBinding = binding;
}

function getR2Client(): { client: S3Client; bucket: string; publicUrl: string } | null {
  const accountId = (process.env.R2_ACCOUNT_ID || "").trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucket = (process.env.R2_BUCKET_NAME || "").trim();
  const publicUrl = (process.env.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucket, publicUrl };
}

export async function uploadToStorage(options: UploadOptions): Promise<UploadResult> {
  const { buffer, originalName, mimeType, folder = "uploads" } = options;
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(originalName) || (mimeType.includes("image/jpeg") ? ".jpg" : mimeType.includes("image/png") ? ".png" : ".bin");
  const cleanBaseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
  const key = `${folder}/${Date.now()}_${uniqueId}_${cleanBaseName}${ext}`;

  // 1. Cloudflare Workers Native R2 Binding
  const workerBucket = activeR2BucketBinding || (globalThis as any).__CF_R2_BUCKET__;
  if (workerBucket && typeof workerBucket.put === "function") {
    try {
      await workerBucket.put(key, buffer, {
        httpMetadata: {
          contentType: mimeType,
        },
      });
      const publicBase = (process.env.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "") || "https://assets.mingree.com";
      return {
        success: true,
        url: `${publicBase}/${key}`,
        fileName: path.basename(key),
        size: buffer.length,
        storageProvider: "r2",
      };
    } catch (cfErr: any) {
      console.error("[STORAGE WORKERS R2 ERROR]", cfErr?.message || cfErr);
    }
  }

  // 2. Cloudflare R2 via S3 Client
  const r2 = getR2Client();
  if (r2) {
    try {
      const command = new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });
      await r2.client.send(command);
      const url = r2.publicUrl ? `${r2.publicUrl}/${key}` : `https://${r2.bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
      return {
        success: true,
        url,
        fileName: path.basename(key),
        size: buffer.length,
        storageProvider: "r2",
      };
    } catch (r2Err: any) {
      console.error("[STORAGE R2 S3 ERROR]", r2Err?.message || r2Err);
    }
  }

  // 3. Vercel Blob (if explicitly configured)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(key, buffer, {
        access: "public",
        contentType: mimeType,
      });
      return {
        success: true,
        url: blob.url,
        fileName: path.basename(key),
        size: buffer.length,
        storageProvider: "vercel_blob",
      };
    } catch (blobErr: any) {
      console.error("[STORAGE BLOB ERROR]", blobErr?.message || blobErr);
    }
  }

  // 4. Production Security Guard: Local/base64 fallback is disabled in production
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Persistent cloud storage is required in production. Cloudflare R2 (R2_BUCKET binding or R2 credentials: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) must be configured. Local filesystem storage is disabled in production."
    );
  }

  // 5. Local Fallback for Development & Preview Mode
  try {
    const localDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const localFileName = `${Date.now()}_${uniqueId}_${cleanBaseName}${ext}`;
    const localFilePath = path.join(localDir, localFileName);
    fs.writeFileSync(localFilePath, buffer);
    return {
      success: true,
      url: `/uploads/${localFileName}`,
      fileName: localFileName,
      size: buffer.length,
      storageProvider: "local",
    };
  } catch {
    return {
      success: true,
      url: `data:${mimeType};base64,${buffer.toString("base64")}`,
      fileName: originalName,
      size: buffer.length,
      storageProvider: "local",
    };
  }
}
