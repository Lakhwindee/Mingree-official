declare module "cloudflare:node" {
  export function httpServerHandler(appOrServer: any): {
    fetch: (request: Request, env?: any, ctx?: any) => Promise<Response>;
  };
}

interface HyperdriveBinding {
  connectionString: string;
}

interface R2BucketBinding {
  put: (key: string, value: any, options?: any) => Promise<any>;
  get: (key: string) => Promise<any>;
  delete: (key: string) => Promise<any>;
}

interface CloudflareEnv {
  HYPERDRIVE?: HyperdriveBinding;
  R2_BUCKET?: R2BucketBinding;
  ASSETS?: any;
  DATABASE_URL?: string;
  APP_URL?: string;
  JWT_SECRET?: string;
  TOKEN_ENC_KEY?: string;
  CASHFREE_MODE?: string;
  CASHFREE_APP_ID?: string;
  CASHFREE_SECRET_KEY?: string;
  INSTAGRAM_APP_ID?: string;
  INSTAGRAM_APP_SECRET?: string;
  GMAIL_USER?: string;
  GMAIL_APP_PASSWORD?: string;
  [key: string]: any;
}
