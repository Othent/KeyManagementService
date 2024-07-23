import { UserDetails } from "../auth/auth0.types";
import { TagData } from "../othent/othent.types";

export type OthentStorageKey = `othent${string}`;

export type Auth0Strategy =
  | "iframe-cookies"
  | "refresh-localstorage"
  | "refresh-memory";

export type AutoConnect = "eager" | "lazy" | "off";

export interface OthentConfig {
  /**
   *
   */
  serverBaseURL: string;
  /**
   *
   */
  auth0Domain: string;
  /**
   *
   */
  auth0ClientId: string;
  /**
   *
   */
  auth0Strategy: Auth0Strategy;
  /**
   *
   */
  cookieKey: OthentStorageKey | null;
  /**
   *
   */
  localStorageKey: OthentStorageKey | null;
  /**
   *
   */
  auth0RefreshTokenExpirationMs: number;
  /**
   *
   */
  autoConnect: AutoConnect;
  /**
   *
   */
  throwErrors: boolean;
  /**
   *
   */
  tags: TagData[];
}

export interface OthentOptions
  extends Partial<Omit<OthentConfig, "cookieKey" | "localStorageKey">> {
  /**
   *
   */
  appName: string;
  /**
   *
   */
  appVersion: string;
  /**
   *
   */
  cookie: boolean | OthentStorageKey;
  /**
   *
   */
  localStorage: boolean | OthentStorageKey;
  /**
   *
   */
  initialUserDetails?: UserDetails | null;
  /**
   *
   */
  crypto?: Crypto | null;
}

export interface AppInfo {
  name: string;
  version: string;
}
