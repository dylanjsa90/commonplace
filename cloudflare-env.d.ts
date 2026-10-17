declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ASSETS?: Fetcher;
    AUTH_PROVIDER?: "password";
    JWT_SECRET?: string;
    ACCESS_TEAM_DOMAIN?: string;
    ACCESS_AUD?: string;
  }
}
