import { ICache } from "@auth0/auth0-spa-js";
import { UserDetails } from "../auth/auth0.types";
import { TagData } from "../othent/othent.types";
import { GatewayConfig } from "../utils/arconnect/arconnect.types";
import { UrlString } from "../utils/typescript/url.types";

export type OthentStorageKey = `othent${string}`;

export type Auth0Strategy = "cross-site-cookies" | "refresh-tokens";

export type Auth0Cache = "memory" | "localstorage" | ICache;

export type Auth0CacheType = "memory" | "localstorage" | "custom";

export type Auth0RedirectUri =
  | UrlString
  | `${string}.auth0://${string}/ios/${string}/callback`
  | `${string}.auth0://${string}/android/${string}/callback`;

export type Auth0RedirectUriWithParams = `${Auth0RedirectUri}?${string}`;

export type Auth0LogInMethod = "popup" | "redirect";

export type AutoConnect = "eager" | "lazy" | "off";

export interface AppInfo {
  /**
   * Name of your app. This will add a tag `App-Name: <appName>` to any transaction signed or sent using `Othent.sign`,
   * `Othent.dispatch` or `Othent.signDataItem`.
   */
  name: string;

  /**
   * Version of your app. This will add a tag `App-Version: <appVersion>` to any transaction signed or sent using
   * `Othent.sign`, `Othent.dispatch` or `Othent.signDataItem`.
   */
  version: string;

  /**
   * Environment your app is currently running on (e.g. "development", "staging", "production", ...). This will add a
   * tag `App-Env: <appEnv>` to any transaction signed or sent using `Othent.sign`, `Othent.dispatch` or
   * `Othent.signDataItem`.
   *
   * If no value (empty `string`) is provided, this will automatically be set to `"development"` if
   * `location.hostname = "localhost"` or `"production"` otherwise.
   */
  env: string;

  /**
   * Image with the logo of your app. Optional and not used for now.
   */
  logo?: UrlString;
}

export interface OthentConfig {
  /**
   * Enable additional logs.
   *
   * @defaultValue `false`
   */
  debug: boolean;

  /**
   * Inject Othent's instance as `globalThis.arweaveWallet` so that `arweave-js` can use it on the background.
   *
   * @defaultValue `false`
   */
  inject: boolean;

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
   * - `refresh-tokens`: Use refresh tokens for authentication. This is the most secure and robust option.
   *
   * - `cross-site-cookies`: Use cross-site cookies for authentication. Not recommended, as this won't work in browsers
   *   that block cross-site cookies, such as Brave.
   *
   * @defaultValue `refresh-tokens`
   */
  auth0Strategy: Auth0Strategy;

  /**
   * Possible values are:
   *
   * - `memory`: This is the most secure and recommended option/location to store tokens, but new tabs won't be able to
   *   automatically log in using a popup without a previous user action.
   *
   *   However, by setting the `persistLocalStorage = true` option, the user details (but not the refresh / access
   *   tokens) will be persisted in `localStorage` until the most recent refresh token's expiration date, allowing you
   *   to read the user details (`.getUserDetails()` / `.getSyncUserDetails()`) and make it look in the UI as if the
   *   user were already logged in.
   *
   * - `localstorage`: Store tokens `localStorage`. This makes it possible for new tabs to automatically log in using a
   *   popup, even after up to 2 weeks of inactivity (i.e. "keep me logged in"), but offers a larger attack surface to
   *   attackers trying to get a hold of the refresh / access tokens.
   *
   * - `custom`: Provide a custom storage implementation that implements Auth0's
   *   [`ICache`](https://auth0.github.io/auth0-spa-js/interfaces/ICache.html). Useful for mobile apps (e.g. React
   *   Native).
   *
   * @defaultValue `memory`
   */
  auth0Cache: Auth0CacheType;

  /**
   * Possible values are:
   *
   * - `popup`: Open Auth0's authentication page on a popup window while the original page just waits for authentication
   *   to take place or to timeout. This option is faster and less intrusive.
   *
   * - `redirect`: Navigate to Auth0's authentication page, which will redirect users back to your site or
   *   `auth0RedirectURI` upon authentication. Once they are redirected back, the URL will show a `code` and `state`
   *   query parameters for a second or two, until the authentication flow is completed.
   *
   * @see https://auth0.github.io/auth0-spa-js/classes/Auth0Client.html#loginWithRedirect
   * @see https://auth0.github.io/auth0-spa-js/classes/Auth0Client.html#handleRedirectCallback
   * @see https://auth0.github.io/auth0-spa-js/classes/Auth0Client.html#loginWithPopup
   *
   * @defaultValue `popup`
   */
  auth0LogInMethod: Auth0LogInMethod;

  // TODO: Consider adding `auth0RedirectURI` and `auth0ReturnToURI` options to `connect()` and `disconnect()` too:

  /**
   * Auth0's callback URL (`redirect_uri`) used during the authentication flow.
   *
   * @see https://auth0.com/docs/authenticate/login/redirect-users-after-login
   *
   * @defaultValue `location.origin` (when available in the platform)
   */
  auth0RedirectURI: Auth0RedirectUri | null;

  /**
   * Auth0's logout URL (`returnTo`) used during the logout flow.
   *
   * @see https://auth0.com/docs/authenticate/login/logout/redirect-users-after-logout
   *
   * @defaultValue `location.origin` (when available in the platform)
   */
  auth0ReturnToURI: Auth0RedirectUri | null;

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
}

export interface OthentOptions
  extends Partial<
    Omit<OthentConfig, "cookieKey" | "localStorageKey" | "auth0Cache">
  > {
  appInfo: AppInfo;

  /**
   * Gateway config to connect to Arweave.
   */
  gatewayConfig?: GatewayConfig;

  /**
   * Set this to `true` or the name of the cookie where you'd like the user details JSON to be stored. Useful when you use
   * SSR and need to user details to be available on the server.
   *
   * The cookie will expire after `refreshTokenExpirationMs`.
   * Note setting this option to `true` will set the cookie on client / frontend, but you'll have to manually recover it on
   * the server / backend, and pass it to `Othent`'s `constructor` as `initialUserDetails`.
   *
   * @defaultValue `false`
   */
  persistCookie?: boolean | OthentStorageKey;

  /**
   * Set this to `true` or the name of the `localStorage` item where you'd like the user details JSON to be stored. Useful
   * to immediately sync user details and authentication status across tabs, and to make it look to users as if they were
   * already authenticated when coming back to your app before `refreshTokenExpirationMs`, even if the session still needs
   * to be refreshed by calling `connect()` or `requireAuth()`.
   *
   * The stored values will be removed / discarded if more than `refreshTokenExpirationMs` have passed, but will remain
   * in `localStorage` until the user logs out or until that time has passed and `Othent` is instantiated again.
   *
   * @defaultValue `false`
   */
  persistLocalStorage?: boolean | OthentStorageKey;

  /**
   * Initial user details. Useful for server-side rendered sites or native apps that might store the most recent user
   * details externally (e.g. cookie or `SharedPreferences`).
   */
  initialUserDetails?: UserDetails | null;

  /**
   * Possible values are:
   *
   * - `memory`: This is the most secure and recommended option/location to store tokens, but new tabs won't be able to
   *   automatically log in using a popup without a previous user action. However, you can set
   *   `persistLocalStorage = true`, which stores the user details, but not the refresh / access tokens, in
   *   `localStorage`.
   *
   * - `localstorage`: Store tokens `localStorage`. This makes it possible for new tabs to automatically log in using a
   *   popup, even after up to 2 weeks of inactivity (i.e. "keep me logged in"), but offers a larger attack surface to
   *   attackers trying to get a hold of the refresh / access tokens.
   *
   * - `custom`: Provide a custom storage implementation that implements Auth0's
   *   [`ICache`](https://auth0.github.io/auth0-spa-js/interfaces/ICache.html). Useful for mobile apps (e.g. React
   *   Native).
   *
   * @defaultValue `memory`
   */
  auth0Cache?: Auth0Cache;
}
