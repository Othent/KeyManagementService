import { Tag } from "warp-arbundles";
import { GatewayConfig } from "../utils/arconnect/arconnect.types";
import { OthentConfig, OthentOptions, OthentStorageKey } from "./config.types";
import { UrlString } from "../utils/typescript/url.types";

export const DEFAULT_OTHENT_CONFIG = {
  auth0Domain: "auth.othent.io",
  auth0ClientId: "uXkRmJoIa0NfzYgYEDAgj6Rss4wR1tIc",
  auth0Strategy: "refresh-memory",
  auth0RefreshTokenExpirationMs: 1296000000, // 2 weeks
  serverBaseURL: "https://kms-server.othent.io",
  autoConnect: "lazy",
  cookieKey: null,
  localStorageKey: null,
  throwErrors: true,
  tags: [],
} as const satisfies OthentConfig;

export const DEFAULT_OTHENT_OPTIONS = {
  ...DEFAULT_OTHENT_CONFIG,
  persistCookie: false,
  persistLocalStorage: false,
  appName: "",
  appVersion: "",
} as const satisfies OthentOptions;

export const DEFAULT_GATEWAY_CONFIG = {
  host: "arweave.net",
  protocol: "https",
  port: 443,
} as const satisfies GatewayConfig;

export const DEFAULT_DISPATCH_NODE =
  "https://turbo.ardrive.io" as const satisfies UrlString;

export const DEFAULT_COOKIE_KEY =
  "othentUserDetails" as const satisfies OthentStorageKey;

export const DEFAULT_LOCAL_STORAGE_KEY =
  "othentUserDetails" as const satisfies OthentStorageKey;

// SKD version / analytics:

export const CLIENT_NAME = "Othent KMS" as const;

// This is updated automatically from Husky's pre-commit hook:
export const CLIENT_VERSION = "2.0.0-beta.4" as const;

export const ANALYTICS_TAGS = [
  {
    name: "Client",
    value: CLIENT_NAME,
  },
  {
    name: "Client-Version",
    value: CLIENT_VERSION,
  },
] as const satisfies Tag[];
