import type { OthentConfig } from "../..";
import { Tag } from "warp-arbundles";
import { GatewayConfig } from "../../types/arconnect/arconnect.types";

export const DEFAULT_OTHENT_CONFIG: OthentConfig = {
  auth0Domain: "auth.othent.io",
  auth0ClientId: "uXkRmJoIa0NfzYgYEDAgj6Rss4wR1tIc",
  auth0Strategy: "iframe-cookies",
  serverBaseURL: "https://kms-server.othent.io",
};

export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  host: "arweave.net",
  protocol: "https",
  port: 443,
};

export const DEFAULT_DISPATCH_NODE = "https://turbo.ardrive.io";

export const CLIENT_NAME = "Othent KMS";

export const CLIENT_VERSION = "0.0.0"; // TODO: Get this from package.json

// TODO: Pass it as an option?
export const DEFAULT_REFRESH_TOKEN_EXPIRATION_MS = 1296000000; // 2 weeks

// TODO: Add more as an option?
export const ANALYTICS_TAGS: Tag[] = [
  {
    name: "Client",
    value: CLIENT_NAME,
  },
  {
    name: "Client-Version",
    value: CLIENT_VERSION,
  },
];
