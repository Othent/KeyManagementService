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
import { UserDetails } from "../auth/auth0.types";
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
import { toBuffer } from "../utils/bufferUtils";
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

function initArweave(apiConfig: ApiConfig) {
  const ArweaveClass = (ArweaveModule as unknown as { default: typeof Arweave })
    .default;

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

  constructor(options: OthentOptions = DEFAULT_OTHENT_OPTIONS) {
    // Crypto validation:

    let crypto: Crypto | null = null;

    if (typeof window !== "undefined") {
      crypto = window.crypto;
    } else if (typeof global !== "undefined") {
      crypto = global.crypto;
    } else {
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

    this.appInfo = appInfo = {
      ...appInfo,
      env: appInfo.env || DEFAULT_APP_INFO.env,
    };

    this.gatewayConfig = gatewayConfig =
      gatewayConfig || DEFAULT_GATEWAY_CONFIG;

    if (!appInfo.name || !appInfo.version || !appInfo.env) {
      throw new Error(
        "Incomplete `appInfo`: `name`, `version` and `env` are required.",
      );
    }

    if (!gatewayConfig.host || !gatewayConfig.port || !gatewayConfig.protocol) {
      throw new Error(
        "Incomplete `gatewayConfig`: `host`, `port` and `protocol` are required.",
      );
    }

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
      window.arweaveWallet = this as any;
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
   * Start listening for `storage` events to sync user details across tabs. Only needed if `persistLocalStorage = true`.
   *
   * @returns A cleanup function that must be called whenever Othent needs to stop listening for `storage` events (e.g.
   * to be used in React's `useEffects`'s cleanup function).
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

  /**
   *
   * @param callbackUriWithParams
   * @returns
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

    let userDetails: UserDetails | null = null;

    try {
      userDetails = await this.auth0.handleRedirectCallback(urlString);
    } finally {
      if (typeof location !== "undefined" && typeof history !== "undefined") {
        searchParams.delete("code");
        searchParams.delete("state");

        // If we are in a browser, remove the `code` and `state` params from the URL:
        history.replaceState(null, "", urlObject);
      }
    }

    return userDetails;
  }

  /**
   * @returns `true` if Othent's Auth0 client has been initialized; `false` otherwise.
   */
  get isReady() {
    return this.auth0.isReady;
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
   * @returns A cleanup function that will remove the error listener when called.
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

  // CONNECT / DISCONNECT:

  /**
   * Prompts the user to sign in/up using Auth0's modal. This function cannot be called programmatically before the user
   * interacts with the page (e.g. by clicking on a button), as that will result in a `Unable to open a popup` error.
   *
   * @returns A Promise with the `UserDetails` or `null` if the log in modal was closed, could not even be opened or
   * authentication failed.
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

    if (appInfo) {
      this.appInfo = appInfo;
      this.auth0.setAppInfo(appInfo);
    }

    this.gatewayConfig = gateway || DEFAULT_GATEWAY_CONFIG;

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

    // We should now have a valid token, but potentially not the user details...

    if (id_token && !userDetails) {
      // If that's the case, we need to update the user in Auth0 calling our API. Note that we pass the last token we
      // got to it to avoid making another call to `encodeToken()` / `getTokenSilently()`:

      await this.api.createUser(id_token);

      // Lastly, we request a new token to update the cached user details and confirm that the `user_metadata` has been
      // correctly updated. Note we don't use as try-catch here, as if any error happens at this point, we just want to
      // throw it.

      const response = await this.auth0.getTokenSilently();

      id_token = response.id_token;
      userDetails = response.userDetails;
    }

    // We should now definitely have a valid token and user details:

    if (id_token && userDetails) return userDetails;

    // Otherwise, something unexpected happened, so we log out and throw:

    // No need to await here as we don't really care about waiting for this:

    this.auth0.logOut();

    throw new Error("Unexpected authentication error");
  }

  /**
   * Logs out the user (disconnect the user's wallet). This will require the user to log back in after called.
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
   */
  getWalletNames() {
    return Promise.resolve(this.getSyncWalletNames());
  }

  /**
   * Returns an object with all the user details of the active (authenticated) user account.
   *
   * @returns A Promise containing all the user details of the active user, or `null` if the user is not authenticated.
   */
  getUserDetails() {
    return Promise.resolve(this.getSyncUserDetails());
  }

  // GET DATA (SYNC):

  /**
   * Get the active wallet address of the users wallet. This function assumes (and requires) a user is authenticated.
   * @returns The active wallet address of the users wallet.
   */
  getSyncActiveAddress() {
    return this.auth0.getCachedUserAddress() || ("" as const);
  }

  /**
   * Get the owner (jwk.n) field of the users wallet. This function assumes (and requires) a user is authenticated.
   * @returns The owner (jwk.n) field of the users wallet.
   */
  getSyncActivePublicKey() {
    return this.auth0.getCachedUserPublicKey() || ("" as const);
  }

  /**
   * Get all addresses of the users wallet. This function assumes (and requires) a user is authenticated.
   * @returns All wallet addresses of the users wallet.
   */
  getSyncAllAddresses() {
    const address = this.auth0.getCachedUserAddress();

    return address ? [address] : [];
  }

  /**
   * Get the wallets (users) email. This function assumes (and requires) a user is authenticated.
   * @returns The wallets (users) email.
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
   * @returns The user's details.
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
   */
  async sign(transaction: Transaction): Promise<Transaction> {
    const { sub, publicKey } = await this.requireUserDataOrThrow();

    const arweave = initArweave(this.gatewayConfig);

    // // Using transaction.tags won't work as those wound still be encoded:
    const transactionTags = (transaction.get("tags") as unknown as Tag[]).map(
      (tag) => ({
        name: tag.get("name", { decode: true, string: true }),
        value: tag.get("value", { decode: true, string: true }),
      }),
    ) satisfies TagData[];

    const tags = this.addCommonTags(transactionTags);

    // This function returns a new signed transaction. It doesn't mutate/sign the original one:
    const transactionToSign = await arweave.createTransaction({
      data: transaction.data,
      owner: publicKey,
      reward: transaction.reward,
    });

    tags.forEach((tagData) => {
      transactionToSign.addTag(tagData.name, tagData.value);
    });

    const dataToSign = await transactionToSign.getSignatureData();
    const signatureBuffer = await this.api.sign(dataToSign, sub);
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
      data: transaction.data,
      tags: transactionTags,
      target: transaction.target,
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
   */
  async encrypt(plaintext: string | BinaryDataType): Promise<Uint8Array> {
    const { sub } = await this.requireUserDataOrThrow();

    const ciphertextBuffer = await this.api.encrypt(plaintext, sub);

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
   */
  async decrypt(ciphertext: BinaryDataType): Promise<Uint8Array> {
    const { sub } = await this.requireUserDataOrThrow();

    const plaintextBuffer = await this.api.decrypt(ciphertext, sub);

    return plaintextBuffer;
  }

  // SIGN:

  /**
   * Generate a signature. This function assumes (and requires) a user is authenticated.
   * @param data The data to sign.
   * @returns The {@linkcode Buffer} format of the signature.
   * @deprecated Use `sign`, `signDataItems` or `signMessage` instead.
   */
  async signature(data: string | BinaryDataType): Promise<Uint8Array> {
    const { sub } = await this.requireUserDataOrThrow();

    const signatureBuffer = await this.api.sign(data, sub);

    return signatureBuffer;
  }

  /**
   * The signDataItem() function allows you to create and sign a data item object, compatible with arbundles. These data
   * items can then be submitted to an ANS-104 compatible bundler.
   * @param dataItem The data to sign.
   * @returns The signed data item.
   */
  async signDataItem(dataItem: DataItem): Promise<ArrayBufferLike> {
    // TODO: DateItem.verify won't work when loading the returned value into it.
    // TODO: Install `warp-bundles` and try to see what's going on here.
    // TODO: Check if this is working in ArConnect: https://github.com/arconnectio/ArConnect/blob/production/src/api/modules/sign_data_item/sign_data_item.background.ts

    const { sub, publicKey } = await this.requireUserDataOrThrow();

    const { data, tags, ...options } = dataItem;

    const signer: Signer = {
      publicKey: toBuffer(publicKey),
      signatureType: 1,
      signatureLength: 512,
      ownerLength: 512,
      sign: this.api.getSignerSignFn(sub),
      // Note we don't provide `verify` as it's not used anyway:
      // verify: () => true,
    };

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
   * @param message The message to sign.
   * @returns The signed version of the message.
   */
  async signMessage(
    data: string | BinaryDataType,
    options?: SignMessageOptions,
  ): Promise<Uint8Array> {
    const { sub } = await this.requireUserDataOrThrow();

    const hashAlgorithm = options?.hashAlgorithm || "SHA-256";

    const hashArrayBuffer = await this.crypto.subtle.digest(
      hashAlgorithm,
      binaryDataTypeOrStringToBinaryDataType(data),
    );

    const signatureBuffer = await this.api.sign(hashArrayBuffer, sub);

    return signatureBuffer;
  }

  /**
   * Verify the given message. This function assumes (and requires) a user is authenticated.
   * @param signature The signature to verify.
   * @returns The signed version of the message.
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
   */
  getArweaveConfig(): Promise<GatewayConfig> {
    return Promise.resolve(this.gatewayConfig);
  }

  /**
   * Get the permissions Othent can use in the current site.
   *
   * @returns Promise of Othent's `PermissionType[]`.
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
}
