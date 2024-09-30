import { Tag } from "warp-arbundles";
import { GatewayConfig } from "../utils/arconnect/arconnect.types";
import {
  AppInfo,
  OthentConfig,
  OthentOptions,
  OthentStorageKey,
} from "./config.types";
import { UrlString } from "../utils/typescript/url.types";

export const DEFAULT_OTHENT_CONFIG = {
  debug: false,
  inject: false,
  auth0Domain: "auth.othent.io",
  auth0ClientId: "uXkRmJoIa0NfzYgYEDAgj6Rss4wR1tIc",
  auth0Strategy: "refresh-tokens",
  auth0Cache: "memory",
  auth0RefreshTokenExpirationMs: 1296000000, // 2 weeks
  auth0LogInMethod: "popup",
  auth0RedirectURI: null,
  auth0ReturnToURI: null,
  serverBaseURL: "https://kms-server.othent.io",
  autoConnect: "lazy",
  cookieKey: null,
  localStorageKey: null,
  throwErrors: true,
  tags: [],
} as const satisfies OthentConfig;

export const DEFAULT_APP_INFO = {
  name: "",
  version: "",
  env:
    typeof location === "undefined"
      ? "production"
      : location.hostname === "localhost"
        ? "development"
        : "production",
} as const satisfies AppInfo;

export const DEFAULT_GATEWAY_CONFIG = {
  host: "arweave.net",
  protocol: "https",
  port: 443,
} as const satisfies GatewayConfig;

export const DEFAULT_OTHENT_OPTIONS = {
  ...DEFAULT_OTHENT_CONFIG,
  appInfo: DEFAULT_APP_INFO,
  gatewayConfig: DEFAULT_GATEWAY_CONFIG,
  persistCookie: false,
  persistLocalStorage: false,
  auth0Cache: "memory",
} as const satisfies OthentOptions;

export const DEFAULT_DISPATCH_NODE =
  "https://turbo.ardrive.io" as const satisfies UrlString;

export const DEFAULT_COOKIE_KEY =
  "othentUserDetails" as const satisfies OthentStorageKey;

export const DEFAULT_LOCAL_STORAGE_KEY =
  "othentUserDetails" as const satisfies OthentStorageKey;

// SKD version / analytics:

export const CLIENT_NAME = "Othent KMS" as const;

// This is updated automatically from Husky's pre-commit hook:
export const CLIENT_VERSION = "2.1.1" as const;

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
