import { Tag } from "warp-arbundles";
import { GatewayConfig } from "../utils/arconnect/arconnect.types";
import { OthentConfig, OthentOptions } from "./config.types";
import { UrlString } from "../utils/typescript/url.types";

export const DEFAULT_OTHENT_CONFIG = {
  auth0Domain: "auth.othent.io",
  auth0ClientId: "uXkRmJoIa0NfzYgYEDAgj6Rss4wR1tIc",
  auth0Strategy: "iframe-cookies",
  auth0RefreshTokenExpirationMs: 1296000000, // 2 weeks
  serverBaseURL: "https://kms-server.othent.io",
  autoConnect: "lazy",
  throwErrors: true,
  tags: [],
} as const satisfies OthentConfig;

export const DEFAULT_OTHENT_OPTIONS = {
  ...DEFAULT_OTHENT_CONFIG,
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

export const CLIENT_NAME = "Othent KMS" as const;

// TODO: Get this from package.json:
export const CLIENT_VERSION = "1.0.12" as const;

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
