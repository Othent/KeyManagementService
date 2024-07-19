import type { OthentConfig, OthentOptions, UrlString } from "../..";
import { Tag } from "warp-arbundles";
import { GatewayConfig } from "../../types/arconnect/arconnect.types";

export const DEFAULT_OTHENT_CONFIG: OthentConfig = {
  auth0Domain: "auth.othent.io",
  auth0ClientId: "uXkRmJoIa0NfzYgYEDAgj6Rss4wR1tIc",
  auth0Strategy: "iframe-cookies",
  serverBaseURL: "https://kms-server.othent.io",
  autoConnect: "lazy",
  throwErrors: true,
  tags: [],
};

export const DEFAULT_OTHENT_OPTIONS: OthentOptions = {
  ...DEFAULT_OTHENT_CONFIG,
  appName: "",
  appVersion: "",
};

export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  host: "arweave.net",
  protocol: "https",
  port: 443,
};

export const DEFAULT_DISPATCH_NODE =
  "https://turbo.ardrive.io" as const satisfies UrlString;

export const CLIENT_NAME = "Othent KMS" as const;

// TODO: Get this from package.json:
export const CLIENT_VERSION = "1.0.12" as const;

// TODO: Pass it as an option?
export const DEFAULT_REFRESH_TOKEN_EXPIRATION_MS = 1296000000 as const; // 2 weeks

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
