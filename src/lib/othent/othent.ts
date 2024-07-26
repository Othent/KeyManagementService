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
import ArweaveModule from "arweave";
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
import { AppInfo, OthentConfig, OthentOptions } from "../config/config.types";

// TODO: Fix this properly:
const ArweaveClass = (ArweaveModule as unknown as any).default as Arweave & {
  init: (apiConfig: ApiConfig) => Arweave;
};

export class Othent
  implements Omit<ArConnect, "connect" | "addToken" | "isTokenAdded">
{
  static walletName = CLIENT_NAME;

  static walletVersion = CLIENT_VERSION;

  private crypto: Crypto;

  private api: OthentKMSClient;

  private auth0: OthentAuth0Client;

  private errorEventListenerHandler =
    new EventListenersHandler<ErrorListener>();

  private devAlertTimeoutID = 0;

  walletName = CLIENT_NAME;

  walletVersion = CLIENT_VERSION;

  config: OthentConfig = DEFAULT_OTHENT_CONFIG;

  appInfo: AppInfo = {
    name: "",
    version: "",
  };

  gatewayConfig = DEFAULT_GATEWAY_CONFIG;

  // TODO: Add B64 / B64Encoded support (e.g. option on encrypt to return B64Encoded, make decrypt accept a B64 input, make all signature functions return B64Encoded results...)

  // TODO: Consider moving some of the dependencies to peer dependencies (arweave, axios, warp-arbundles)

  constructor(options: OthentOptions = DEFAULT_OTHENT_OPTIONS) {
    let {
      crypto: cryptoOption,
      appName,
      appVersion,
      initialUserDetails,
      persistCookie,
      persistLocalStorage,
      ...configOptions
    } = options;

    this.config = {
      ...DEFAULT_OTHENT_CONFIG,
      ...configOptions,
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
    };

    const { cookieKey, localStorageKey } = this.config;

    if (typeof cookieKey === "string" && !cookieKey.startsWith("othent")) {
      throw new Error('`cookieKey` must start with "othent".');
    }

    if (
      typeof localStorageKey === "string" &&
      !localStorageKey.startsWith("othent")
    ) {
      throw new Error('`cookieKey` must start with "othent".');
    }

    this.appInfo = {
      name: appName,
      version: appVersion,
    };

    let crypto = cryptoOption;

    if (!crypto) {
      if (typeof window !== "undefined") {
        crypto = window.crypto;
      } else if (typeof global !== "undefined") {
        crypto = global.crypto;
      } else if (crypto === undefined) {
        throw new Error(
          "A Crypto module is needed to use `signMessage` and `verifyMessage`. If you are sure you won't be using those, pass `crypto: null` as an option.",
        );
      }
    }

    const { config } = this;

    if (
      config.autoConnect === "eager" &&
      config.auth0Strategy === "refresh-memory"
    ) {
      throw new Error(
        'In-memory refresh tokens cannot be used with `autoConnect = "eager"`. Use `autoConnect = "lazy"` instead',
      );
    }

    this.crypto = crypto!;

    this.auth0 = new OthentAuth0Client({
      domain: config.auth0Domain,
      clientId: config.auth0ClientId,
      strategy: config.auth0Strategy,
      cookieKey: config.cookieKey,
      localStorageKey: config.localStorageKey,
      refreshTokenExpirationMs: config.auth0RefreshTokenExpirationMs,
      appInfo: this.appInfo,
      initialUserDetails,
    });

    if (this.config.autoConnect === "eager") {
      this.connect();
    }

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

    if (process.env.NODE_ENV === "development") {
      console.group(`${this.walletName} @ ${this.walletVersion}`);

      Object.entries(config).map(([key, value]) => {
        console.log(` ${key.padStart(13)} = ${value}`);
      });

      console.groupEnd();
    }
  }

  /**
   * Start listening for `storage` events to sync user details across tabs. Only needed if `persistLocalStorage = true`.
   *
   * @returns A cleanup function that must be called whenever Othent needs to stop listening for `storage` events (e.g.
   * to be used in React's `useEffects`'s cleanup function).
   */
  init() {
    this.auth0.initStorageSyncing();

    return () => {
      // TODO: Add an option to clear localStorage if we only want it to sync tabs or add a new option to do that onunload?
      this.auth0.stopStorageSyncing();
    };
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

      if (process.env.NODE_ENV === "development") {
        window.clearTimeout(this.devAlertTimeoutID);

        this.devAlertTimeoutID = window.setTimeout(() => {
          alert(
            'When using `throwErrors = false`, you must add at least one error event listener with `othent.addEventListener("error", () => { ... })`',
          );
        }, 1000);
      }
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
   * Automatically checks if the user is authenticated and, if they are not, it authenticates them automatically, either
   * from an existing session or by prompting them to log in again.
   *
   * @returns `Promise<void>` you can await while the authentication / re-authentication process is happening.
   */
  requireAuth() {
    return this.requireUserDataOrThrow().then(() => {});
  }

  /**
   * Automatically checks if the user is authenticated and, if they are not, it authenticates them automatically, either
   * from an existing session or by prompting them to log in again.
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
   * @returns A Promise with the `UserDetails` or `null` if the log in modal was closed or could not even be opened.
   */
  async connect(
    permissions?: PermissionType[],
    appInfo?: AppInfo,
    gateway?: GatewayConfig,
  ): Promise<UserDetails | null> {
    if (permissions) {
      console.warn(
        "Permissions param is ignored. Othent will have access to everything.",
      );
    }

    if (appInfo) {
      this.appInfo = appInfo;
      this.auth0.setAppInfo(appInfo);
    }

    this.gatewayConfig = { ...gateway, ...DEFAULT_GATEWAY_CONFIG };

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
        !err.message.startsWith("Missing Refresh Token")
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
        // However, there are 2 common scenarios where `logIn()` will throw an error:
        //
        // - When calling `connect()` before the user interacts with the page (e.g. clicks on a button). This happens
        //   because we use `connect()` both when the user clicks in a "Log In" / "Connect" button, but also to
        //   automatically try to get an existing token / connection.
        //
        // - When the user closes the authentication popup without authenticating.
        //
        // In both cases, we just log the errors and return null; any other error, we throw.

        if (!(err instanceof Error)) throw err;

        if (
          err.message === "Popup closed" ||
          err.message.startsWith("Unable to open a popup for loginWithPopup")
        ) {
          console.warn(err.message);

          return null;
        }
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
   * Disconnect the users wallet. This will require the user to log back in after called.
   * @returns Nothing.
   */
  async disconnect() {
    return this.auth0.logOut();
  }

  // GET DATA (ASYNC):

  /**
   * Get the active wallet address of the users wallet, wrapped in a Promise. This function assumes (and requires) a user is logged in.
   * @returns A Promise with the active wallet address of the users wallet.
   */
  getActiveAddress() {
    return Promise.resolve(this.getSyncActiveAddress());
  }

  /**
   * Get the owner (jwk.n) field of the users wallet, wrapped in a Promise. This function assumes (and requires) a user is logged in.
   * @returns A Promise with the owner (jwk.n) field of the users wallet.
   */
  getActivePublicKey() {
    return Promise.resolve(this.getSyncActivePublicKey());
  }

  /**
   * Get all addresses of the users wallet, wrapped in a Promise. This function assumes (and requires) a user is logged in.
   * @returns A Promise with all wallet addresses of the users wallet.
   */
  getAllAddresses() {
    return Promise.resolve(this.getSyncAllAddresses());
  }

  /**
   * Get the wallets (users) email, wrapped in a Promise. This function assumes (and requires) a user is logged in.
   * @returns A Promise with the wallets (users) email.
   */
  getWalletNames() {
    return Promise.resolve(this.getSyncWalletNames());
  }

  /**
   * Get user details, wrapped in a Promise. This function assumes (and requires) a user is logged in.
   * @returns A Promise with the user's details.
   */
  getUserDetails() {
    return Promise.resolve(this.getSyncUserDetails());
  }

  // GET DATA (SYNC):

  /**
   * Get the active wallet address of the users wallet. This function assumes (and requires) a user is logged in.
   * @returns The active wallet address of the users wallet.
   */
  getSyncActiveAddress() {
    return this.auth0.getCachedUserAddress() || "";
  }

  /**
   * Get the owner (jwk.n) field of the users wallet. This function assumes (and requires) a user is logged in.
   * @returns The owner (jwk.n) field of the users wallet.
   */
  getSyncActivePublicKey() {
    return this.auth0.getCachedUserPublicKey() || "";
  }

  /**
   * Get all addresses of the users wallet. This function assumes (and requires) a user is logged in.
   * @returns All wallet addresses of the users wallet.
   */
  getSyncAllAddresses() {
    const address = this.auth0.getCachedUserAddress();

    return address ? [address] : [];
  }

  /**
   * Get the wallets (users) email. This function assumes (and requires) a user is logged in.
   * @returns The wallets (users) email.
   */
  getSyncWalletNames() {
    const address = this.auth0.getCachedUserAddress();

    // TODO: This should instead say something like `Google (email@gmail.com)` or `Twitter (email@outlook.com)`...
    const addressName = this.auth0.getCachedUserEmail();

    return Promise.resolve(
      address && addressName
        ? {
            [address]: addressName,
          }
        : {},
    );
  }

  /**
   * Get user details. This function assumes (and requires) a user is logged in.
   * @returns The user's details.
   */
  getSyncUserDetails() {
    return this.auth0.getCachedUserDetails();
  }

  // TX:

  private addCommonTags(tags?: TagData[]): TagData[];
  private addCommonTags(transaction: Transaction): void;
  private addCommonTags(transactionOrTags: TagData[] | Transaction = []) {
    if (Array.isArray(transactionOrTags)) {
      const appInfoTags: TagData[] = [
        { name: "App-Name", value: this.appInfo.name },
        { name: "App-Version", value: this.appInfo.version },
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

    for (const { name, value } of ANALYTICS_TAGS) {
      transactionOrTags.addTag(name, value);
    }

    transactionOrTags.addTag("App-Name", this.appInfo.name);
    transactionOrTags.addTag("App-Version", this.appInfo.version);
  }

  /**
   * Sign the given transaction. This function assumes (and requires) a user is logged in and a valid arweave transaction.
   * @param transaction The transaction to sign.
   * @returns The signed version of the transaction.
   */
  async sign(transaction: Transaction): Promise<Transaction> {
    const { sub, publicKey } = await this.requireUserDataOrThrow();

    // TODO: We should probably create a new transaction instead of updating the one passed as param:
    transaction.setOwner(publicKey);

    this.addCommonTags(transaction);

    const dataToSign = await transaction.getSignatureData();

    const signatureBuffer = await this.api.sign(dataToSign, sub);

    let id = await hash(signatureBuffer);

    transaction.setSignature({
      id: uint8ArrayTob64Url(id),
      owner: publicKey,
      signature: uint8ArrayTob64Url(signatureBuffer),
    });

    return transaction;
  }

  /**
   * dispatch the given transaction. This function assumes (and requires) a user is logged in and a valid arweave transaction.
   * @param transaction The transaction to sign.
   * @returns The signed version of the transaction.
   */
  async dispatch(transaction: Transaction, options?: DispatchOptions) {
    const { sub, publicKey } = await this.requireUserDataOrThrow();

    const signer: Signer = {
      publicKey: toBuffer(publicKey),
      signatureType: 1,
      signatureLength: 512,
      ownerLength: 512,
      sign: this.api.getSignerSignFn(sub),
      // Note we don't provide `verify` as it's not used anyway:
      // verify: null,
    };

    this.addCommonTags(transaction);

    // Using transaction.tags won't work as those wound still be encoded:
    const tags = (transaction.get("tags") as unknown as Tag[]).map((tag) => ({
      name: tag.get("name", { decode: true, string: true }),
      value: tag.get("value", { decode: true, string: true }),
    })) satisfies TagData[];

    const dateItem = createData(transaction.data, signer, { tags });

    // TODO: https://turbo.ardrive.io/ returns `freeUploadLimitBytes`, so we can check before trying to send and potentially ever before signing.
    // TODO: If we do that, verify what's the difference in size if we do dateItem.getRaw() before and after signing is 512 bits.

    // DataItem.sign() sets the DataItem's `id` property and returns its `rawId`:
    await dateItem.sign(signer);

    const url = `${options?.node || DEFAULT_DISPATCH_NODE}/tx`;

    try {
      // TODO: Try with a bunch of different nodes and/or retry?
      // TODO: Use axios-retry here?

      const res = await axios.post<ArDriveBundledTransactionResponseData>(
        url,
        dateItem.getRaw(),
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

      await this.sign(transaction);

      const arweave = options?.arweave ?? ArweaveClass.init(this.gatewayConfig);

      const uploader = await arweave.transactions.getUploader(transaction);

      while (!uploader.isComplete) {
        await uploader.uploadChunk();
      }

      return {
        id: transaction.id,
        signature: transaction.signature,
        owner: transaction.owner,
        type: "BASE",
      } satisfies UploadedTransactionData;
    }
  }

  // ENCRYPT/DECRYPT:

  /**
   * Encrypt data with the users JWK. This function assumes (and requires) a user is logged in and a valid string to sign.
   * @param plaintext The data in string format to sign.
   * @returns The encrypted data.
   */
  async encrypt(plaintext: string | BinaryDataType): Promise<Uint8Array> {
    const { sub } = await this.requireUserDataOrThrow();

    const ciphertextBuffer = await this.api.encrypt(plaintext, sub);

    return ciphertextBuffer;
  }

  /**
   * Decrypt data with the users JWK. This function assumes (and requires) a user is logged in and a valid encrypt() response.
   * @param ciphertext The data to decrypt.
   * @returns The decrypted data.
   */
  async decrypt(ciphertext: BinaryDataType): Promise<string> {
    const { sub } = await this.requireUserDataOrThrow();

    const plaintext = await this.api.decrypt(ciphertext, sub);

    return plaintext;
  }

  // SIGN:

  // TODO: Add deprecation warning (and update all TSDocs according to what's on ArConnect and add references to their docs).

  /**
   * Generate a signature. This function assumes (and requires) a user is logged in.
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
   * The signDataItem() function allows you to create and sign a data item object, compatible with arbundles. These data items can then be submitted to an ANS-104 compatible bundler.
   * @param dataItem The data to sign.
   * @returns The signed data item.
   */
  async signDataItem(dataItem: DataItem): Promise<ArrayBufferLike> {
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
   * Sign the given message. This function assumes (and requires) a user is logged in.
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
   * Verify the given message. This function assumes (and requires) a user is logged in.
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
    return Promise.resolve([
      "ACCESS_ADDRESS",
      "ACCESS_PUBLIC_KEY",
      "ACCESS_ALL_ADDRESSES",
      "SIGN_TRANSACTION",
      "ENCRYPT",
      "DECRYPT",
      "SIGNATURE",
      "ACCESS_ARWEAVE_CONFIG",
      "DISPATCH",
    ]);
  }
}
