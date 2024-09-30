import { OthentAuth0Client } from "../auth/auth0";
import {
  B64UrlString,
  BinaryDataType,
  binaryDataTypeOrStringToBinaryDataType,
  hash,
  uint8ArrayTob64Url,
} from "../utils/arweaveUtils";
import { createData, DataItemCreateOptions, Signer } from "warp-arbundles";
import { OthentKMSClient } from "../othent-kms-client/client";
import { IdTokenWithData, UserDetails } from "../auth/auth0.types";
import {
  ArConnect,
  GatewayConfig,
  PermissionType,
  SignMessageOptions,
} from "../utils/arconnect/arconnect.types";
import {
  ANALYTICS_TAGS,
  CLIENT_NAME,
  CLIENT_VERSION,
  DEFAULT_APP_INFO,
  DEFAULT_COOKIE_KEY,
  DEFAULT_DISPATCH_NODE,
  DEFAULT_GATEWAY_CONFIG,
  DEFAULT_OTHENT_CONFIG,
  DEFAULT_OTHENT_OPTIONS,
} from "../config/config.constants";
import { OthentError } from "../utils/errors/error";
import {
  BaseEventListener,
  EventListenersHandler,
} from "../utils/events/event-listener-handler";
import { isPromise } from "../utils/promises/promises.utils";
import axios from "axios";
import type Transaction from "arweave/web/lib/transaction";
import type { Tag } from "arweave/web/lib/transaction";
import type Arweave from "arweave/web";
import type { ApiConfig } from "arweave/web/lib/api";
import {
  ArDriveBundledTransactionData,
  ArDriveBundledTransactionResponseData,
  DataItem,
  DispatchOptions,
  ErrorListener,
  EventListenersByType,
  OthentEventType,
  TagData,
  UploadedTransactionData,
} from "./othent.types";
import {
  AppInfo,
  Auth0RedirectUri,
  Auth0RedirectUriWithParams,
  OthentConfig,
  OthentOptions,
} from "../config/config.types";
import { mergeOptions } from "../utils/options/options.utils";
import ArweaveModule from "arweave";
import {
  MissingRefreshTokenError,
  PopupCancelledError,
  PopupTimeoutError,
} from "@auth0/auth0-spa-js";
import { Buffer } from "buffer";
import { toBuffer } from "../utils/bufferUtils";
import { ServerInfoOptions } from "../othent-kms-client/operations/server-info";

function initArweave(apiConfig: ApiConfig) {
  const ArweaveClass = (ArweaveModule as any).hasOwnProperty("default")
    ? (ArweaveModule as unknown as { default: typeof ArweaveModule }).default
    : ArweaveModule;

  return ArweaveClass.init(apiConfig);
}

// Omit `connect()` just because to Othent's version returning some data:
export class Othent implements Omit<ArConnect, "connect"> {
  static walletName = CLIENT_NAME;

  static walletVersion = CLIENT_VERSION;

  static ALL_PERMISSIONS = [
    "ACCESS_ADDRESS",
    "ACCESS_ALL_ADDRESSES",
    "ACCESS_ARWEAVE_CONFIG",
    "ACCESS_PUBLIC_KEY",
    "DECRYPT",
    "DISPATCH",
    "ENCRYPT",
    "SIGN_TRANSACTION",
    "SIGNATURE",
  ] as const satisfies PermissionType[];

  private crypto: Crypto;

  private api: OthentKMSClient;

  private auth0: OthentAuth0Client;

  private errorEventListenerHandler =
    new EventListenersHandler<ErrorListener>();

  private tokens = new Set<string>();

  walletName = CLIENT_NAME;

  walletVersion = CLIENT_VERSION;

  config: OthentConfig = DEFAULT_OTHENT_CONFIG;

  appInfo: AppInfo = DEFAULT_APP_INFO;

  gatewayConfig: GatewayConfig = DEFAULT_GATEWAY_CONFIG;

  /**
   * Instantiate `Othent`.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/constructor|constructor() docs}
   */
  constructor(options: OthentOptions = DEFAULT_OTHENT_OPTIONS) {
    // Buffer polyfill:

    if (!globalThis.Buffer) {
      globalThis.Buffer = Buffer;

      console.warn(
        "`globalThis.Buffer` has been polyfilled for you. Note this could have side-effect and affect other libraries.",
      );
    }

    // Crypto validation:

    const crypto: Crypto | null = globalThis.crypto || null;

    if (!crypto) {
      throw new Error(
        "A Crypto module is needed for Othent to work. If your environment doesn't natively provide one, you should polyfill it.",
      );
    }

    this.crypto = crypto;

    // Merge default options:

    let {
      appInfo,
      gatewayConfig,
      persistCookie,
      persistLocalStorage,
      initialUserDetails,
      auth0Cache = DEFAULT_OTHENT_CONFIG.auth0Cache,
      auth0RedirectURI,
      auth0ReturnToURI,
      ...configOptions
    } = options;

    const defaultRedirectURI =
      typeof location === "undefined"
        ? null
        : (location.origin as Auth0RedirectUri);

    this.config = {
      ...mergeOptions<OthentConfig>(configOptions, DEFAULT_OTHENT_CONFIG),
      cookieKey:
        typeof persistCookie === "string"
          ? persistCookie
          : persistCookie
            ? DEFAULT_COOKIE_KEY
            : null,
      localStorageKey:
        typeof persistLocalStorage === "string"
          ? persistLocalStorage
          : persistLocalStorage
            ? DEFAULT_COOKIE_KEY
            : null,
      auth0Cache: typeof auth0Cache === "object" ? "custom" : auth0Cache,
      auth0RedirectURI: auth0RedirectURI || defaultRedirectURI,
      auth0ReturnToURI: auth0ReturnToURI || defaultRedirectURI,
    };

    // AppInfo & Gateway configs:

    this.setAppInfo(appInfo);
    this.setGatewayConfig(gatewayConfig);

    // Cookie and localStorage persistance (validation):

    const { config } = this;
    const { cookieKey, localStorageKey } = config;

    if (typeof cookieKey === "string" && !cookieKey.startsWith("othent")) {
      throw new Error(
        '`persistCookie` / `cookieKey` must start with "othent".',
      );
    }

    if (
      typeof localStorageKey === "string" &&
      !localStorageKey.startsWith("othent")
    ) {
      throw new Error(
        '`persistLocalStorage` / `localStorageKey` must start with "othent".',
      );
    }

    // Auth0 options validation:

    if (!config.auth0RedirectURI) {
      throw new Error("`auth0RedirectURI` is required.");
    }

    if (!config.auth0ReturnToURI) {
      throw new Error("`auth0ReturnToURI` is required.");
    }

    if (
      config.autoConnect === "eager" &&
      config.auth0LogInMethod === "popup" &&
      config.auth0Strategy === "refresh-tokens" &&
      auth0Cache === "memory"
    ) {
      throw new Error(
        'The browser cannot open the authentication modal automatically before an user interaction. Use `autoConnect = "lazy"` or change any of these other options: `auth0LogInMethod`, `auth0Strategy` or `auth0Cache`.',
      );
    }

    // (Othent's) Auth0 Client:

    this.auth0 = new OthentAuth0Client({
      debug: config.debug,
      domain: config.auth0Domain,
      clientId: config.auth0ClientId,
      strategy: config.auth0Strategy,
      cache: auth0Cache,
      loginMethod: config.auth0LogInMethod,
      redirectURI: config.auth0RedirectURI,
      returnToURI: config.auth0ReturnToURI,
      refreshTokenExpirationMs: config.auth0RefreshTokenExpirationMs,
      appInfo: this.appInfo,
      initialUserDetails,
      cookieKey: config.cookieKey,
      localStorageKey: config.localStorageKey,
    });

    // Auto-connect:

    if (config.autoConnect === "eager") {
      if (typeof location === "undefined") {
        this.connect();
      } else {
        const url = new URL(location.href);
        const { searchParams } = url;

        // If we just got redirected to Auth0's callback URL, do not try to connect again, as
        // `completeConnectionAfterRedirect()` needs to be called.
        if (!searchParams.has("code") && !searchParams.has("state")) {
          this.connect();
        }
      }
    }

    // Inject wallet in `window`:

    if (config.inject) {
      // TODO: This will work fine as soon as ArConnect also updates their types to match their docs. Those changes have
      // already been added to `arconnect.types.ts`:
      // window.arweaveWallet = this as unknown as ArConnect;

      (globalThis as any).arweaveWallet = this as any;
    }

    // Error handling:

    if (!config.throwErrors) {
      const walletMethods = [
        "connect",
        "disconnect",
        "getActiveAddress",
        "getActivePublicKey",
        "getAllAddresses",
        "getWalletNames",
        "getUserDetails",
        "getSyncActiveAddress",
        "getSyncActivePublicKey",
        "getSyncAllAddresses",
        "getSyncWalletNames",
        "getSyncUserDetails",
        "sign",
        "dispatch",
        "encrypt",
        "decrypt",
        "signature",
        "signDataItem",
        "signMessage",
        "verifyMessage",
        "privateHash",
        "getArweaveConfig",
        "getPermissions",
      ] as const satisfies (keyof Othent)[];

      walletMethods.forEach((walletMethod) => {
        let fn = this[walletMethod] as Function;

        if (typeof fn !== "function") return;

        fn = fn.bind(this);

        this[walletMethod] = ((...args: unknown[]) => {
          try {
            let result = fn(...args);

            if (isPromise(result)) {
              result = result.catch((err: unknown) => {
                this.onError(err);

                return null;
              });
            }

            return result;
          } catch (err) {
            this.onError(err);
          }

          return null;
        }) as any;
      });
    }

    this.api = new OthentKMSClient(this.config.serverBaseURL, this.auth0);
  }

  /**
   * @param appInfo Setter and validator for `appInfo`.
   *
   * @returns `Othent.appInfo`
   */
  private setAppInfo(appInfo: AppInfo) {
    const nextAppInfo = {
      ...appInfo,
      env: appInfo.env || DEFAULT_APP_INFO.env,
    };

    if (!nextAppInfo.name || !nextAppInfo.version || !nextAppInfo.env) {
      throw new Error(
        "Incomplete `appInfo`: `name`, `version` and `env` are required.",
      );
    }

    if (this.auth0) this.auth0.setAppInfo(nextAppInfo);

    return (this.appInfo = nextAppInfo);
  }

  /**
   * @param appInfo Setter and validator for `gatewayConfig`.
   *
   * @returns `Othent.gatewayConfig`
   */
  private setGatewayConfig(gatewayConfig?: GatewayConfig) {
    const nextGatewayConfig = gatewayConfig || DEFAULT_GATEWAY_CONFIG;

    if (
      !nextGatewayConfig.host ||
      !nextGatewayConfig.port ||
      !nextGatewayConfig.protocol
    ) {
      throw new Error(
        "Incomplete `gatewayConfig`: `host`, `port` and `protocol` are required.",
      );
    }

    return (this.gatewayConfig = nextGatewayConfig);
  }

  /**
   * Start listening for `storage` events to sync user details across tabs. Only needed if `persistLocalStorage = true`.
   *
   * @returns A cleanup function that must be called whenever Othent needs to stop listening for `storage` events (e.g.
   * to be used in React's `useEffects`'s cleanup function).
   *
   * @see {@link https://docs.othent.io/js-sdk-api/start-tab-synching|startTabSynching() docs}
   */
  startTabSynching() {
    if (!this.config.localStorageKey) {
      console.warn(
        "Calling `Othent.startTabSynching()` is a NOOP unless the `persistLocalStorage` option is used.",
      );
    }

    this.auth0.initStorageSyncing();

    return () => {
      this.auth0.stopStorageSyncing();
    };
  }

  // ERROR EVENT / ERROR HANDLING:

  private onError(error: unknown) {
    if (!(error instanceof Error)) {
      console.warn("Unknown error type", error);

      return;
    }

    if (this.errorEventListenerHandler.hasListeners) {
      this.errorEventListenerHandler.emit(error as Error | OthentError);
    } else {
      console.warn(
        "Unhandled unthrown error:\n",
        error,
        '\nWhen using `throwErrors = false`, you must add at least one error event listener with `othent.addEventListener("error", () => { ... })`',
      );
    }
  }

  /**
   * Add an event listener for the specific error type.
   *
   * @param type `"auth"` or `error`.
   * @param listener Function of type `AuthListener` or `ErrorListener`.
   *
   * @returns A cleanup function that will remove the error listener when called.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/events|Events docs}
   */
  addEventListener<E extends OthentEventType>(
    type: E,
    listener: EventListenersByType[E],
  ) {
    let eventListenerHandler: EventListenersHandler<BaseEventListener> | null =
      null;

    if (type === "auth") {
      eventListenerHandler = this.auth0.getAuthEventListenerHandler();
    } else if (type === "error") {
      if (this.config.throwErrors)
        throw new Error(
          "You can only listen for `error` events if `throwErrors = false`.",
        );

      eventListenerHandler = this.errorEventListenerHandler;
    }

    if (!eventListenerHandler) throw new Error("Unknown event type");

    eventListenerHandler.add(listener);

    return () => {
      eventListenerHandler.delete(listener);
    };
  }

  /**
   * Remove an error listener of the specified error type.
   *
   * @param type `"auth"` or `error`.
   * @param listener Function of type `AuthListener` or `ErrorListener`.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/events|Events docs}
   */
  removeEventListener<E extends OthentEventType>(
    type: E,
    listener: EventListenersByType[E],
  ) {
    let eventListenerHandler: EventListenersHandler<BaseEventListener> | null =
      null;

    if (type === "auth") {
      eventListenerHandler = this.auth0.getAuthEventListenerHandler();
    } else if (type === "error") {
      eventListenerHandler = this.errorEventListenerHandler;
    }

    if (!eventListenerHandler) throw new Error("Unknown event type");

    eventListenerHandler.delete(listener);
  }

  // AUTH LOADING:

  /**
   * @returns `true` if the user is authenticated; `false` otherwise.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/is-authenticated|isAuthenticated docs}
   */
  get isAuthenticated() {
    return this.auth0.isAuthenticated;
  }

  /**
   * Automatically checks if the user is authenticated. If they are not, and...
   *
   * - `autoConnect === "eager"`: Prompts them to sign in/up again. It throws an error if authentication fails.
   * - `autoConnect === "lazy"`: Authenticates them automatically, either from an existing session or by prompting them
   *   to sign in/up again. It throws an error if authentication fails.
   * - `autoConnect === "off"`: It throws an error.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/require-auth|requireAuth() docs}
   */
  requireAuth() {
    return this.requireUserDataOrThrow().then(() => {});
  }

  /**
   * Automatically checks if the user is authenticated. If they are not, and...
   *
   * - `autoConnect === "eager"`: Prompts them to sign in/up again. It throws an error if authentication fails.
   * - `autoConnect === "lazy"`: Authenticates them automatically, either from an existing session or by prompting them
   *   to sign in/up again. It throws an error if authentication fails.
   * - `autoConnect === "off"`: It throws an error.
   *
   * @returns `Promise<{ sub, publicKey }>` to get these 2 properties required in most Othent functions.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/require-auth|requireAuth() docs}
   */
  private async requireUserDataOrThrow() {
    if (this.config.autoConnect !== "off" && !this.auth0.isAuthenticated) {
      await this.connect(undefined, undefined, this.gatewayConfig);
    }

    const { sub, owner } = this.auth0.getCachedUserDetails() || {};

    if (!sub || !owner) throw new Error("Missing cached user.");

    return {
      sub,
      publicKey: owner,
    };
  }

  // CONNECT / DISCONNECT / USER CREATION:

  private async completeConnectionOrCreateAuth0User(
    userDetails: UserDetails | null,
    hasIdToken: boolean,
  ) {
    // If we already have the user details we need, we simply return them:
    if (userDetails && hasIdToken) return userDetails;

    // We should now have a valid token, but potentially not the user details (as we didn't create the Auth0 user with
    // the custom fields yet)...

    // TODO: This check needs to be improved. In the production version, this should:
    // - Redirect users to a popup / iframe where they can generate and get their keys and learn about them.
    // - Make sure this works for new users and also for users that did not complete the key generation/import step before.

    const importOnly = false;

    if (!userDetails?.walletAddress && hasIdToken) {
      // If that's the case, we need to update the user in Auth0 calling our API. Note that we pass the last token we
      // got to it to avoid making another call to `encodeToken()` / `getTokenSilently()`:

      // TODO: If the user was already created but the key creation process didn't work properly, or if the
      // import process wasn't completed, this flow won't work as expected:

      const idTokenWithData = await this.api.createUser({ importOnly });

      // The `createUser` call above returns the updated user details (as `IdTokenWithData<null>`), so there's no need
      // request a new token to update the cached user details. Instead, we just extract the `UserDetails` from the API
      // response. Note we don't use as try-catch here, as if any error happens at this point, we just want to throw it.

      const userDetailsFromCreateUserResponse =
        await this.auth0.updateUserDetails(idTokenWithData);

      // We should now definitely have a valid token and user details:
      if (userDetailsFromCreateUserResponse)
        return userDetailsFromCreateUserResponse;
    }

    // Otherwise, something unexpected happened, so we log out and throw:

    // No need to await here as we don't really care about waiting for this:
    this.auth0.logOut();

    // Just in case someone is using `preserveLogs = true` in the DevTools Console. Otherwise, they will not see this
    // error as `logOut` will reload the page:
    throw new Error("Unexpected authentication error");
  }

  /**
   * If and only if you set the [`auth0LogInMethod = "redirect"`](./constructor.md#auth0loginmethod-auth0loginmethod) option,
   * users will be redirected to Auth0 to authenticate and then back to your application. When they land back in your
   * application, you must call `completeConnectionAfterRedirect()` to complete the authentication process.
   *
   * By default, `callbackUriWithParams = location.href`, if you environment supports it. Otherwise, you'll have to manually
   * pass an URI with the `code` and `state` params provided by Auth0, which handles the redirect callback.
   *
   * See [Auth0's `handleRedirectCallback`](https://auth0.github.io/auth0-spa-js/classes/Auth0Client.html#handleRedirectCallback).
   *
   * @param callbackUriWithParams
   *
   * @returns A Promise with the `UserDetails` or `null` if the log in modal was closed, could not even be opened or
   * authentication failed.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/complete-connection-after-redirect|completeConnectionAfterRedirect() docs}
   */
  async completeConnectionAfterRedirect(
    callbackUriWithParams?: Auth0RedirectUriWithParams,
  ): Promise<UserDetails | null> {
    if (this.config.auth0LogInMethod !== "redirect") {
      console.warn(
        'Calling `Othent.completeConnectionAfterRedirect()` is a NOOP unless the `auth0LogInMethod` options is `"redirect"`.',
      );
    }

    // We default to the current URL, if we are in a browser:
    const urlString =
      callbackUriWithParams ||
      (typeof location === "undefined"
        ? ""
        : (location.href as Auth0RedirectUriWithParams));

    // If this is a mobile app URI, we need to turn it into an URL before passing it to the `URL` constructor (just to parse the params):
    const urlObject = new URL(urlString.replace(/.+\.auth0:\/\//, "https://"));

    const { searchParams } = urlObject;

    // If this function is called but there are no `code` and `state` params available, this is a NOOP:
    if (!searchParams.has("code") || !searchParams.has("state") || !urlString)
      return null;

    let idToken: IdTokenWithData<void> | null = null;
    let userDetails: UserDetails | null = null;

    try {
      const urlStringData = await this.auth0.handleRedirectCallback(urlString);

      idToken = urlStringData.idToken;
      userDetails = urlStringData.userDetails;
    } catch (err) {
      console.warn(
        "The connection could not be completed. There was an error during the redirect flow:\n",
        err,
      );
    } finally {
      if (typeof location !== "undefined" && typeof history !== "undefined") {
        searchParams.delete("code");
        searchParams.delete("state");

        // If we are in a browser, remove the `code` and `state` params from the URL:
        history.replaceState(null, "", urlObject);
      }
    }

    return this.completeConnectionOrCreateAuth0User(userDetails, !!idToken);
  }

  /**
   * Prompts the user to sign in/up using Auth0's modal. This function cannot be called programmatically before the user
   * interacts with the page (e.g. by clicking on a button), as that will result in a `Unable to open a popup` error.
   *
   * @returns A Promise with the `UserDetails` or `null` if the log in modal was closed, could not even be opened or
   * authentication failed.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/connect|connect() docs}
   */
  async connect(
    permissions?: PermissionType[],
    appInfo?: AppInfo,
    gateway?: GatewayConfig,
  ): Promise<UserDetails | null> {
    if (
      permissions &&
      permissions.toSorted().join("-") !== Othent.ALL_PERMISSIONS.join("-")
    ) {
      throw new Error(
        "Othent implicitly has access to all available permissions. You should pass `permissions = undefined` or include all of them.",
      );
    }

    if (appInfo) this.setAppInfo(appInfo);
    if (gateway) this.setGatewayConfig(gateway);

    // TODO: We can probably save a token generation on page first load using Auth0Client.checkSession() instead.
    // TODO: If the user is already authenticated, this should be a NOOP.

    // Call `getTokenSilently()` to reconnect if we still have a valid token / session.
    //
    // - If we do, `getTokenSilently()` returns the user data.
    // - If we don't, it throws a `Login required` error.
    // - We can also get a `Missing Refresh Token` error when using in-memory refresh tokens.

    let id_token = "";
    let userDetails: UserDetails | null = null;

    try {
      const response = await this.auth0.getTokenSilently();

      id_token = response.id_token;
      userDetails = response.userDetails;
    } catch (err) {
      // If we get an error other than `Login required` or `Missing Refresh Token`, we throw it:

      if (!(err instanceof Error)) throw err;

      if (
        err.message !== "Login required" &&
        !(err instanceof MissingRefreshTokenError)
      ) {
        throw err;
      }

      console.warn(err.message);
    }

    if (!id_token) {
      try {
        // If we made it this far but we don't have a token, we need to log in, so we call `logIn()`. If everything goes
        // well, `logIn()` will internally call `getTokenSilently()` again after
        // successful authentication, and return a valid token with the user data:

        // TODO: Check if the `getTokenSilently` inside `logIn` can be removed (it might be redundant, particularly on the redirect flow):
        const response = await this.auth0.logIn();

        id_token = response.id_token;
        userDetails = response.userDetails;
      } catch (err) {
        if (!(err instanceof Error)) throw err;

        // This call to `connect()` will never "finish". We just "await" here indefinitely while the browser navigates
        // to Auth0's authentication page.
        if (err.message === "Redirecting...") await new Promise(() => {});

        // There are 3 other common scenarios where `logIn()` will throw an error:
        //
        // - When calling `connect()` before the user interacts with the page (e.g. clicks on a button). This happens
        //   because we use `connect()` both when the user clicks in a "Log In" / "Connect" button, but also to
        //   automatically try to get an existing token / connection.
        //
        // - When the user closes the authentication popup without authenticating.
        //
        // - When the user takes too long (> 60 seconds) to authenticate.
        //
        // In all these cases, we just log the errors and return null; any other error, we throw.

        if (
          err.message.startsWith("Unable to open a popup") ||
          err instanceof PopupCancelledError ||
          err instanceof PopupTimeoutError
        ) {
          if (err instanceof PopupTimeoutError) err.popup.close();

          console.warn(err.message);

          return null;
        }

        throw err;
      }
    }

    return this.completeConnectionOrCreateAuth0User(userDetails, !!id_token);
  }

  /**
   * Logs out the user (disconnect the user's wallet). This will require the user to log back in after called.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/disconnect|disconnect() docs}
   */
  async disconnect() {
    return this.auth0.logOut();
  }

  // GET DATA (ASYNC):

  /**
   * Returns the Arweave wallet address associated with the active (authenticated) user account.
   *
   * The wallet address is derived from the corresponding public key (see [`getActivePublicKey()`](get-active-public-key.md)).
   *
   * This function assumes (and requires) a user is authenticated.
   *
   * @returns A Promise with the active wallet address of the users wallet.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/get-active-address|getActiveAddress() docs}
   */
  getActiveAddress() {
    return Promise.resolve(this.getSyncActiveAddress());
  }

  /**
   * Returns the public key (`jwk.n` field) associated with the active (authenticated) user account.
   *
   * This function assumes (and requires) a user is authenticated.
   *
   * @returns A Promise with the owner (jwk.n field) of the users wallet.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/get-active-public-key|getActivePublicKey() docs}
   */
  getActivePublicKey() {
    return Promise.resolve(this.getSyncActivePublicKey());
  }

  /**
   * Returns an array of Arweave wallet addresses associated with the active (authenticated) user account.
   *
   * However, note that Othent does not currently support creating/storing more than one wallet associated to the same
   * account, so this function will always return exactly one wallet address.
   *
   * This function assumes (and requires) a user is authenticated.
   *
   * @returns A Promise with an array of all wallet addresses of the users wallet.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/get-all-addresses|getAllAddresses() docs}
   */
  getAllAddresses() {
    return Promise.resolve(this.getSyncAllAddresses());
  }

  /**
   * Similarly to ArConnect, each wallet in Othent has a nickname. This is either:
   *
   * - The user's [ANS](https://ans.gg) name.
   * - A platform + email identifying label (e.g. `Google (email@gmail.com)`, `Twitter (email@outlook.com)`...).
   *
   * To provide better UX, you can retrieve these names and display them to the user, so that they can easily recognize
   * which wallet they're using.
   *
   * However, note that Othent does not currently support creating/storing more than one wallet associated to the same
   * account, so this function will always return exactly one wallet address.
   *
   * This function assumes (and requires) a user is authenticated.
   *
   * @returns A Promise containing an object that maps each wallet addresses to their nickname.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/get-wallet-names|getWalletNames() docs}
   */
  getWalletNames() {
    return Promise.resolve(this.getSyncWalletNames());
  }

  /**
   * Returns an object with all the user details of the active (authenticated) user account.
   *
   * @returns A Promise containing all the user details of the active user, or `null` if the user is not authenticated.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/get-user-details|getUserDetails() docs}
   */
  getUserDetails() {
    return Promise.resolve(this.getSyncUserDetails());
  }

  // GET DATA (SYNC):

  /**
   * Get the active wallet address of the users wallet. This function assumes (and requires) a user is authenticated.
   *
   * @returns The active wallet address of the users wallet.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/get-sync-active-address|getSyncActiveAddress() docs}
   */
  getSyncActiveAddress() {
    return this.auth0.getCachedUserAddress() || ("" as const);
  }

  /**
   * Get the owner (jwk.n) field of the users wallet. This function assumes (and requires) a user is authenticated.
   *
   * @returns The owner (jwk.n) field of the users wallet.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/get-sync-active-public-key|getSyncActivePublicKey() docs}
   */
  getSyncActivePublicKey() {
    return this.auth0.getCachedUserPublicKey() || ("" as const);
  }

  /**
   * Get all addresses of the users wallet. This function assumes (and requires) a user is authenticated.
   *
   * @returns All wallet addresses of the users wallet.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/get-sync-all-addresses|getSyncAllAddresses() docs}
   */
  getSyncAllAddresses() {
    const address = this.auth0.getCachedUserAddress();

    return address ? [address] : [];
  }

  /**
   * Get the wallets (users) email. This function assumes (and requires) a user is authenticated.
   *
   * @returns The wallets (users) email.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/get-sync-wallet-names|getSyncWalletNames() docs}
   */
  getSyncWalletNames(): Promise<Record<B64UrlString, string>> {
    const address = this.auth0.getCachedUserAddress();
    const addressLabel = this.auth0.getCachedUserAddressLabel();

    return Promise.resolve(
      address && addressLabel
        ? {
            [address]: addressLabel,
          }
        : {},
    );
  }

  /**
   * Get user details. This function assumes (and requires) a user is authenticated.
   *
   * @returns The user's details.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/get-sync-user-details|getSyncUserDetails() docs}
   */
  getSyncUserDetails() {
    return this.auth0.getCachedUserDetails();
  }

  // TX:

  private addCommonTags(tags?: TagData[]): TagData[];
  private addCommonTags(transaction: Transaction): void;
  private addCommonTags(transactionOrTags: TagData[] | Transaction = []) {
    const { appInfo } = this;

    if (Array.isArray(transactionOrTags)) {
      const appInfoTags: TagData[] = [
        { name: "App-Name", value: appInfo.name },
        { name: "App-Version", value: appInfo.version },
        { name: "App-Env", value: appInfo.env },
      ];

      return [
        ...transactionOrTags,
        ...this.config.tags,
        ...appInfoTags,
        ...ANALYTICS_TAGS,
      ];
    }

    for (const { name, value } of this.config.tags) {
      transactionOrTags.addTag(name, value);
    }

    transactionOrTags.addTag("App-Name", appInfo.name);
    transactionOrTags.addTag("App-Version", appInfo.version);
    transactionOrTags.addTag("App-Env", appInfo.env);

    for (const { name, value } of ANALYTICS_TAGS) {
      transactionOrTags.addTag(name, value);
    }
  }

  /**
   * To submit a transaction to the Arweave Network, it first has to be signed using a private key. Othent creates a private
   * key / Arweave wallet for every account and stores it in Google KMS. The wallet associated with the active user account
   * is used to sign transactions using the `sign()` function.
   *
   * The `sign()` function is meant to replicate the behavior of the `transactions.sign()` function of
   * [`arweave-js`](https://github.com/arweaveTeam/arweave-js#sign-a-transaction), but instead of mutating the transaction
   * object, it returns a new and signed transaction instance.
   *
   * This function assumes (and requires) a user is authenticated and a valid arweave transaction.
   *
   * @param transaction The transaction to sign.
   *
   * @returns A Promise containing a new signed transaction.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/sign|sign() docs}
   * @see {@link https://docs.arweave.org/developers/arweave-node-server/http-api#transaction-format|Transaction Format docs}
   */
  async sign(transaction: Transaction): Promise<Transaction> {
    const { publicKey } = await this.requireUserDataOrThrow();
    const arweave = initArweave(this.gatewayConfig);

    // Using transaction.tags won't work as those wound still be encoded:
    const transactionTags = (transaction.get("tags") as unknown as Tag[]).map(
      (tag) => ({
        name: tag.get("name", { decode: true, string: true }),
        value: tag.get("value", { decode: true, string: true }),
      }),
    ) satisfies TagData[];

    const tags = this.addCommonTags(transactionTags);

    // This function returns a new signed transaction. It doesn't mutate/sign the original one:
    const transactionToSign = await arweave.createTransaction({
      format: transaction.format,
      owner: publicKey,
      reward: transaction.reward,

      // This value is added automatically when creating a transaction, so instead of propagating the one from the one
      // the user sends, we'll just leave it to the new `createTransaction` to fill this in:
      // last_tx: transaction.last_tx,

      // To transfer AR:
      target: transaction.target,
      quantity: transaction.quantity,

      // To send data:
      data: transaction.data,
      data_root: transaction.data_root,
      data_size: transaction.data_size,
    });

    tags.forEach((tagData) => {
      transactionToSign.addTag(tagData.name, tagData.value);
    });

    const dataToSign = await transactionToSign.getSignatureData();
    const signatureBuffer = await this.api.sign(dataToSign);
    const id = await hash(signatureBuffer);

    transactionToSign.setSignature({
      id: uint8ArrayTob64Url(id),
      owner: publicKey,
      signature: uint8ArrayTob64Url(signatureBuffer),
      tags: transactionToSign.tags,
      reward: transactionToSign.reward,
    });

    return transactionToSign;
  }

  /**
   * The `dispatch()` function allows you to quickly sign and send a transaction to the network in a bundled format. It is
   * best for smaller datas and contract interactions. If the bundled transaction cannot be submitted, it will fall back to a
   * base layer transaction. The function returns the [result](dispatch.md#dispatch-result) of the API call.
   *
   * This function assumes (and requires) a user is authenticated and a valid arweave transaction.
   *
   * @param transaction The transaction to sign and dispatch.
   *
   * @returns The signed version of the transaction.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/dispatch|dispatch() docs}
   */
  async dispatch(
    transaction: Transaction,
    options?: DispatchOptions,
  ): Promise<ArDriveBundledTransactionData | UploadedTransactionData> {
    // Using transaction.tags won't work as those wound still be encoded:
    const transactionTags = (transaction.get("tags") as unknown as Tag[]).map(
      (tag) => ({
        name: tag.get("name", { decode: true, string: true }),
        value: tag.get("value", { decode: true, string: true }),
      }),
    ) satisfies TagData[];

    // Delegate the DataItem creation and signing to `signDataItem`:
    const signedDataItemBuffer = await this.signDataItem({
      // Not used for now as `transaction.last_tx` is not 32 bytes, as required by `DataItem`:
      // anchor: transaction.last_tx,
      target: transaction.target,
      data: transaction.data,
      tags: transactionTags,
    });

    // TODO: https://turbo.ardrive.io/ returns `freeUploadLimitBytes`, so we can check before trying to send and potentially ever before signing.
    // TODO: If we do that, verify what's the difference in size if we do dateItem.getRaw() before and after signing is 512 bits.
    // TODO: Also see https://github.com/arconnectio/ArConnect/blob/production/src/api/modules/dispatch/dispatch.background.ts#L107

    const url = `${options?.node || DEFAULT_DISPATCH_NODE}/tx`;

    try {
      // TODO: Try with a bunch of different nodes and/or retry?
      // TODO: Use axios-retry here?

      const res = await axios.post<ArDriveBundledTransactionResponseData>(
        url,
        signedDataItemBuffer,
        {
          headers: {
            "Content-Type": "application/octet-stream",
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          responseType: "json",
        },
      );

      if (res.status >= 400) {
        throw new Error(`${res.status} - ${JSON.stringify(res.data)}`);
      }

      return {
        ...res.data,
        type: "BUNDLED",
      } satisfies ArDriveBundledTransactionData;
    } catch (err) {
      console.warn(`Error dispatching transaction to ${url} =\n`, err);

      const signedTransaction = await this.sign(transaction);

      const arweave = options?.arweave ?? initArweave(this.gatewayConfig);

      const uploader =
        await arweave.transactions.getUploader(signedTransaction);

      while (!uploader.isComplete) {
        await uploader.uploadChunk();
      }

      return {
        id: signedTransaction.id,
        signature: signedTransaction.signature,
        owner: signedTransaction.owner,
        type: "BASE",
      } satisfies UploadedTransactionData;
    }
  }

  // ENCRYPT/DECRYPT:

  /**
   * Encrypt data with the users JWK.
   *
   * This function assumes (and requires) a user is authenticate.
   *
   * @param plaintext The data in string format to sign.
   *
   * @returns The encrypted data.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/encrypt|encrypt() docs}
   */
  async encrypt(plaintext: string | BinaryDataType): Promise<Uint8Array> {
    await this.requireUserDataOrThrow();

    const ciphertextBuffer = await this.api.encrypt(plaintext);

    return ciphertextBuffer;
  }

  /**
   * Decrypt data with the users JWK.
   *
   * This function assumes (and requires) a user is authenticated.
   *
   * @param ciphertext The data to decrypt.
   *
   * @returns The decrypted data.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/decrypt|decrypt() docs}
   */
  async decrypt(ciphertext: BinaryDataType): Promise<Uint8Array> {
    await this.requireUserDataOrThrow();

    const plaintextBuffer = await this.api.decrypt(ciphertext);

    return plaintextBuffer;
  }

  // SIGN:

  /**
   * Generate a signature. This function assumes (and requires) a user is authenticated.
   *
   * @deprecated Use `sign`, `signDataItems` or `signMessage` instead.
   *
   * @param data The data to sign.
   *
   * @returns The {@linkcode Buffer} format of the signature.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/signature|signature() docs}
   */
  async signature(data: string | BinaryDataType): Promise<Uint8Array> {
    await this.requireUserDataOrThrow();

    const signatureBuffer = await this.api.sign(data);

    return signatureBuffer;
  }

  /**
   * The signDataItem() function allows you to create and sign a data item object, compatible with arbundles. These data
   * items can then be submitted to an ANS-104 compatible bundler.
   *
   * @param dataItem The data to sign.
   *
   * @returns The signed data item.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/sign-data-item|signDataItem() docs}
   */
  async signDataItem(dataItem: DataItem): Promise<ArrayBufferLike> {
    // TODO: DateItem.verify won't work when loading the returned value into it.
    // TODO: Install `warp-bundles` and try to see what's going on here.
    // TODO: Check if this is working in ArConnect: https://github.com/arconnectio/ArConnect/blob/production/src/api/modules/sign_data_item/sign_data_item.background.ts

    const { publicKey } = await this.requireUserDataOrThrow();

    const { data, tags, ...options } = dataItem;

    const signer: Signer = {
      publicKey: toBuffer(publicKey),
      signatureType: 1,
      signatureLength: 512,
      ownerLength: 512,
      sign: this.api.getSignerSignFn(),
      // Note we don't provide `verify` as it's not used anyway:
      // verify: () => true,
    };

    // TODO: Debugging code to see where the `signDataItem` signature issue is coming from:

    /*
    const original = this.crypto.subtle.importKey.bind(this.crypto.subtle) as Function;

    this.crypto.subtle.importKey = (...args: any[]) => {
      console.log("ARGS =", args);

      return original(...args);
    }

    const publicJwk = {
      kty: "RSA",
      e: "AQAB",
      n: publicKey,
    } as const;

    this.crypto.subtle.importKey(
      "jwk",
      publicJwk,
      {
        name: "RSA-PSS",
        hash: {
          name: "SHA-256",
        },
      },
      false,
      ["verify"]
    );
    */

    const opts: DataItemCreateOptions = {
      ...options,
      tags: this.addCommonTags(tags),
    };

    const dataItemInstance = createData(data, signer, opts);

    // DataItem.sign() sets the DataItem's `id` property and returns its `rawId`:
    await dataItemInstance.sign(signer);

    return dataItemInstance.getRaw().buffer;
  }

  /**
   * Sign the given message. This function assumes (and requires) a user is authenticated.
   *
   * @param message The message to sign.
   *
   * @returns The signed version of the message.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/sign-message|signMessage() docs}
   */
  async signMessage(
    data: string | BinaryDataType,
    options?: SignMessageOptions,
  ): Promise<Uint8Array> {
    await this.requireUserDataOrThrow();

    const hashAlgorithm = options?.hashAlgorithm || "SHA-256";

    const hashArrayBuffer = await this.crypto.subtle.digest(
      hashAlgorithm,
      binaryDataTypeOrStringToBinaryDataType(data),
    );

    const signatureBuffer = await this.api.sign(hashArrayBuffer);

    return signatureBuffer;
  }

  /**
   * Verify the given message. This function assumes (and requires) a user is authenticated.
   *
   * @param signature The signature to verify.
   *
   * @returns The signed version of the message.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/verify-message|verifyMessage() docs}
   */
  async verifyMessage(
    data: string | BinaryDataType,
    signature: string | BinaryDataType,
    publicKey?: B64UrlString,
    options: SignMessageOptions = { hashAlgorithm: "SHA-256" },
  ): Promise<boolean> {
    if (!publicKey) {
      const requiredUserData = await this.requireUserDataOrThrow();

      publicKey ||= requiredUserData.publicKey;
    }

    const hashAlgorithm = options?.hashAlgorithm || "SHA-256";

    const hashArrayBuffer = await this.crypto.subtle.digest(
      hashAlgorithm,
      binaryDataTypeOrStringToBinaryDataType(data),
    );

    const publicJWK: JsonWebKey = {
      e: "AQAB",
      ext: true,
      kty: "RSA",
      n: publicKey,
    };

    const cryptoKey = await this.crypto.subtle.importKey(
      "jwk",
      publicJWK,
      {
        name: "RSA-PSS",
        hash: options.hashAlgorithm,
      },
      false,
      ["verify"],
    );

    const result = await this.crypto.subtle.verify(
      { name: "RSA-PSS", saltLength: 32 },
      cryptoKey,
      binaryDataTypeOrStringToBinaryDataType(signature),
      hashArrayBuffer,
    );

    return result;
  }

  /**
   * Create a deterministic secret based on the input data.
   *
   * @param data Input data to generate the hash from.
   * @param options Hash algorithm (default = `SHA-256`).
   *
   * @returns Hash `Uint8Array`.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/private-hash|privateHash() docs}
   */
  async privateHash(
    data: string | BinaryDataType,
    options?: SignMessageOptions,
  ): Promise<Uint8Array> {
    return hash(
      binaryDataTypeOrStringToBinaryDataType(data),
      options?.hashAlgorithm,
    );
  }

  // MISC.:

  /**
   * Get the Arweave config used by Othent.
   *
   * @returns Promise of Othent's `GatewayConfig`.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/get-arweave-config|getArweaveConfig() docs}
   */
  getArweaveConfig(): Promise<GatewayConfig> {
    return Promise.resolve(this.gatewayConfig);
  }

  /**
   * Get the permissions Othent can use in the current site.
   *
   * @returns Promise of Othent's `PermissionType[]`.
   *
   * @see {@link https://docs.othent.io/js-sdk-api/get-permissions|getPermissions() docs}
   */
  getPermissions(): Promise<PermissionType[]> {
    return Promise.resolve(Othent.ALL_PERMISSIONS);
  }

  /**
   * Mocked implementation to add tokens.
   * Othent doesn't currently support this feature and only tracks added tokens temporarily in memory.
   */
  addToken(id: string, type?: string, gateway?: GatewayConfig): Promise<void> {
    console.warn(
      "Othent doesn't currently support this feature and only tracks added tokens temporarily in memory.",
    );

    this.tokens.add(id);

    return Promise.resolve();
  }

  /**
   * Mocked implementation to check if a token has been added.
   * Othent doesn't currently support this feature and only tracks added tokens temporarily in memory.
   */
  isTokenAdded(id: string): Promise<boolean> {
    console.warn(
      "Othent doesn't currently support this feature and only tracks added tokens temporarily in memory.",
    );

    return Promise.resolve(this.tokens.has(id));
  }

  // DEVELOPMENT:

  __overridePublicKey(publicKeyPEM: string) {
    this.auth0.overridePublicKey(publicKeyPEM);
  }

  __getServerInfo(options?: ServerInfoOptions) {
    return this.api.serverInfo(options);
  }
}
