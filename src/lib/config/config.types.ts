import { TagData } from "../othent/othent.types";

export type Auth0Strategy =
  | "iframe-cookies"
  | "refresh-localstorage"
  | "refresh-memory";

export type AutoConnect = "eager" | "lazy" | "off";

export interface OthentConfig {
  auth0Domain: string;
  auth0ClientId: string;
  auth0Strategy: Auth0Strategy;
  serverBaseURL: string;
  autoConnect: AutoConnect;
  throwErrors: boolean;
  tags: TagData[];
}

export interface OthentOptions extends Partial<OthentConfig> {
  appName: string;
  appVersion: string;
  crypto?: Crypto | null;
}

export interface AppInfo {
  name: string;
  version: string;
}
