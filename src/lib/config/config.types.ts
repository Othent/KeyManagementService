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
   * API base URL. Needed if you are using a private/self-hosted API and Auth0 tenant.
   */
  serverBaseURL: string;

  /**
   * Auth0 domain. Needed if you are using a private/self-hosted API and Auth0 tenant.
   */
  auth0Domain: string;

  /**
   * Auth0 client ID. Needed if you are using a private/self-hosted API and Auth0 tenant, or if you have a dedicated
   * App inside Othent's Auth0 tenant to personalize the logic experience (premium subscription).
   */
  auth0ClientId: string;

  /**
   * Possible values are:
   *
   * - `iframe-cookies`: Use cross-site cookies for authentication and store the cache in memory. Not recommended, as
   *   this won't work in browsers that block cross-site cookies, such as Brave.
   *
   * - `refresh-localstorage`: Use refresh tokens for authentication and store the cache in localStorage. This makes it
   *   possible for new tabs to automatically log in, even after up to 2 weeks of inactivity (i.e. "keep me logged in"),
   *   but offers a larger attack surface to attackers trying to get a hold of the refresh / access tokens.
   *
   * - `refresh-memory`: Use cross-domain cookies for authentication and store the cache in memory. This is the most
   *   secure and recommended option, but new tabs won't be able to automatically log in (without a previous user
   *   action). However, you can achieve that setting the `localStorage = true` option, which stores the user details
   *   but not the refresh / access tokens in `localStorage`.
   *
   * @defaultValue `refresh-memory`
   */
  auth0Strategy: Auth0Strategy;

  /**
   * Name of the cookie where the user details JSON will be stored.
   *
   * @defaultValue `null`
   */
  cookieKey: OthentStorageKey | null;

  /**
   * Name of the `localStorage` item where the user details JSON will be stored.
   *
   * @defaultValue `null`
   */
  localStorageKey: OthentStorageKey | null;

  /**
   * Refresh token expiration in milliseconds. This should/must match the value set in Auth0. On the client, this value
   * is only used to set a timer to automatically log out users when their refresh token expires. Incorrectly setting
   * this value will make users think they are still logged in, even after their refresh token expires (until they try
   * to perform any kind of action through Othent and get an error).
   *
   * @defaultValue `1296000000` (2 weeks)
   */
  auth0RefreshTokenExpirationMs: number;

  /**
   * Possible values are:
   *
   * - `eager`: Try to log in as soon as the page loads. This won't work when using `auth0Strategy = "refresh-memory"`.
   *
   * - `lazy` Try to log in as soon as there's an attempt to perform any action through Othent. This will only work with
   *   `auth0Strategy = "refresh-memory"` if the first action is preceded by a user action (e.g. click on a button).
   *
   * - `off`: Do not log in automatically. Trying to perform any action through Othent before calling `connect()` or
   *   `requireAuth()` will result in an error.
   *
   * @defaultValue `lazy`
   */
  autoConnect: AutoConnect;

  /**
   * All `Othent` methods could throw an error, so you should wrap them in `try-catch` blocks. Alternatively, you can
   * set this option to `false` and the library will do this automatically, so no method will ever throw an error. In
   * this case, however, you must add at least one error event listener with `othent.addEventListener("error", () => { ... })`.
   *
   * @defaultValue `true`
   */
  throwErrors: boolean;

  /**
   * Additional tags to include in transactions signed or sent using `Othent.sign`, `Othent.dispatch` or
   * `Othent.signDataItem`.
   *
   * @defaultValue `[]`
   */
  tags: TagData[];
}

export interface OthentOptions
  extends Partial<Omit<OthentConfig, "cookieKey" | "localStorageKey">> {

  /**
   * Name of your app. This will add a tag `App-Name: <appName>` to any transaction signed or sent using `Othent.sign`,
   * `Othent.dispatch` or `Othent.signDataItem`.
   */
  appName: string;

  /**
   * Version of your app. This will add a tag `App-Version: <appVersion>` to any transaction signed or sent using
   * `Othent.sign`, `Othent.dispatch` or `Othent.signDataItem`.
   */
  appVersion: string;

  /**
   * Set this to `true` or the name of the cookie where you'd like the user details JSON to be stored.
   *
   * Note setting thisoption to `true` will set the cookie on the client / frontend, but it won't recover it on the
   * server / backend. If you are using SSR, you need to use `cookie = true` in conjunction with `initialUserDetails`.
   *
   * @defaultValue `false`
   */
  cookie: boolean | OthentStorageKey;

  /**
   * Set this to `true` or the name of the `localStorage` item where you'd like the user details JSON to be stored.
   *
   * Note the stored values will be removed / discarded if more than `refreshTokenExpirationMs` have passed, but will
   * remain in `localStorage` until then or until the user logs out.
   *
   * @defaultValue `false`
   */
  localStorage: boolean | OthentStorageKey;

  /**
   * Initial user details. Useful for server-side rendered sites or native apps that might store the most recent user
   * details externally (e.g. cookie or `SharedPreferences`).
   */
  initialUserDetails?: UserDetails | null;

  /**
   * Crypto module needed for signing, if your environment doesn't provide one natively (e.g. React Native).
   */
  crypto?: Crypto | null;
}

export interface AppInfo {
  name: string;
  version: string;
}
