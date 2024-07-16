import type { OthentConfig } from "../..";
import { Tag } from "warp-arbundles";

/*
// TODO: Use production defaults:

export const DEFAULT_OTHENT_CONFIG: OthentConfig = {
  auth0Domain: "auth.othent.io",
  auth0ClientId: "uXkRmJoIa0NfzYgYEDAgj6Rss4wR1tIc",
  auth0UseRefreshTokens: true,
  serverBaseURL: "https://kms-server.othent.io",
};
*/

export const DEFAULT_OTHENT_CONFIG: OthentConfig = {
  auth0Domain: "gmzcodes-test.eu.auth0.com",
  auth0ClientId: "RSEz2IKqExKJTMqJ1crVSqjBT12ZgsfW",
  auth0Strategy: 'refresh-memory',
  serverBaseURL: "http://localhost:3010",
};

export const CLIENT_NAME = "Othent KMS";

export const CLIENT_VERSION = ""; // TODO: Get this from package.json

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
