import { Buffer } from "buffer";
import { OthentAuth0Client } from "./lib/auth/auth0";
import Transaction, { Tag } from "arweave/web/lib/transaction";
import { addOthentAnalyticsTags } from "./lib/analytics/analytics.utils";
import Arweave from "arweave";
import {
  BinaryDataType,
  binaryDataTypeOrStringToBinaryDataType,
  hash,
  uint8ArrayTob64Url,
} from "./lib/utils/arweaveUtils";
import { createData, DataItemCreateOptions, Signer } from "warp-arbundles";
import { OthentKMSClient } from "./lib/othent-kms-client/client";
import {
  Auth0Strategy,
  AuthListener,
  UserDetails,
} from "./lib/auth/auth0.types";
import {
  AppInfo,
  ArConnect,
  DataItem,
  DispatchResult,
  GatewayConfig,
  PermissionType,
  SignMessageOptions,
} from "./types/arconnect/arconnect.types";
import {
  ANALYTICS_TAGS,
  CLIENT_NAME,
  CLIENT_VERSION,
  DEFAULT_DISPATCH_NODE,
  DEFAULT_GATEWAY_CONFIG,
  DEFAULT_OTHENT_CONFIG,
} from "./lib/config/config.constants";
import { OthentError } from "./lib/utils/errors/error";
import {
  BaseEventListener,
  EventListenersHandler,
} from "./lib/events/event-listener-handler";

// Type exports:

export {
  DispatchResult,
  SignMessageOptions,
} from "./types/arconnect/arconnect.types";
export { TypedArray, BinaryDataType } from "./lib/utils/arweaveUtils";

export {
  Auth0Strategy,
  IdTokenWithData,
  UserDetails,
  AuthListener,
} from "./lib/auth/auth0.types";

// Constant exports:

export {
  DEFAULT_OTHENT_CONFIG,
  CLIENT_NAME,
  CLIENT_VERSION,
} from "./lib/config/config.constants";

// B64 utils:
// TODO: Add everything in a namespace/object:

export { uint8ArrayTob64Url } from "./lib/utils/arweaveUtils";

// TODO: Polyfill. Should we overwrite a global like this from a library?

window.Buffer = Buffer;

export interface OthentConfig {
  auth0Domain: string;
  auth0ClientId: string;
  auth0Strategy: Auth0Strategy;
  serverBaseURL: string;
}

export interface OthentOptions extends Partial<OthentConfig> {
  crypto?: Crypto | null;
}

export type URL = `http://${string}` | `https://${string}`;

export interface DispatchOptions {
  arweave?: Arweave;
  node?: URL;
}

export type OthentEventType = "auth" | "error";

export type ErrorListener = (err: Error | OthentError) => void;

export type EventListenersByType = {
  auth: AuthListener;
  error: ErrorListener;
};

export class Othent
  implements
    Omit<ArConnect, "connect" | "signDataItem" | "addToken" | "isTokenAdded">
{
  private crypto: Crypto;

  private api: OthentKMSClient;

  private auth0: OthentAuth0Client;

  private errorEventListenerHandler =
    new EventListenersHandler<ErrorListener>();

  walletName = CLIENT_NAME;

  walletVersion = CLIENT_VERSION;

  config: OthentConfig = DEFAULT_OTHENT_CONFIG;

  gatewayConfig = DEFAULT_GATEWAY_CONFIG;

  // TODO: When using refresh tokens in memory, the developer has to manually call connect() before calling any other function, as otherwise
  // get a "Missing cached user." error. Can we improve that?

  // TODO: Option autoConnect: eager | auto | off

  // TODO: Add listener for errors and a silentErrors: boolean property?

  // TODO: Add an option to globally add our own tags?

  // TODO: Consider moving some of the dependencies to peer dependencies (arweave, axios, warp-arbundles)

  constructor(options: OthentOptions = {}) {
    let { crypto: cryptoOption, ...configOptions } = options;

    this.config = { ...configOptions, ...DEFAULT_OTHENT_CONFIG };

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

    this.crypto = crypto!;

    this.auth0 = new OthentAuth0Client(
      this.config.auth0Domain,
      this.config.auth0ClientId,
      this.config.auth0Strategy,
    );

    this.api = new OthentKMSClient(this.config.serverBaseURL, this.auth0);

    if (process.env.NODE_ENV === "development") {
      console.log(`${this.walletName} @ ${this.walletVersion}`);

      Object.entries(this.config).map(([key, value]) => {
        console.log(` ${key.padStart(13)} = ${value}`);
      });
    }
  }

  async init() {
    await this.auth0.init();
  }

  addEventListener<E extends OthentEventType>(
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

    eventListenerHandler.add(listener);

    return () => {
      eventListenerHandler.delete(listener);
    };
  }

  removeEventListener<E extends OthentEventType>(
    listener: EventListenersByType[E],
  ) {
    this.errorEventListenerHandler.delete(listener as any);
    this.auth0.getAuthEventListenerHandler().delete(listener as any);
  }

  // CONNECT / DISCONNECT:

  /**
   * Connect the users account, this is the same as login/signup in one function.
   * @returns The the users details.
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
      // TODO: Add version and use this as part of the default analytics tags. Also add these to constructor!
    }

    this.gatewayConfig = { ...gateway, ...DEFAULT_GATEWAY_CONFIG };

    // TODO: We can probably save a token generation on page first load using Auth0Client.checkSession() instead.

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
        // well, `logIn()` will internally call `getTokenSilently()` again after successful authentication, and return a
        // valid token with the user data:

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

    // TODO: Re-enable in production?
    // this.auth0.logOut().catch((err) => {
    //   console.warn(err instanceof Error ? err.message : err);
    // });

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

  /**
   * Sign the given transaction. This function assumes (and requires) a user is logged in and a valid arweave transaction.
   * @param transaction The transaction to sign.
   * @returns The signed version of the transaction.
   */
  async sign(transaction: Transaction): Promise<Transaction> {
    const publicKey = this.auth0.getCachedUserPublicKey();
    const sub = this.auth0.getCachedUserSub();

    if (!publicKey || !sub) throw new Error("Missing cached user.");

    transaction.setOwner(publicKey);

    addOthentAnalyticsTags(transaction);

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
  async dispatch(
    transaction: Transaction,
    options?: DispatchOptions,
  ): Promise<DispatchResult> {
    const publicKeyBuffer = this.auth0.getCachedUserPublicKeyBuffer();
    const sub = this.auth0.getCachedUserSub();

    if (!publicKeyBuffer || !sub) throw new Error("Missing cached user.");

    const signer: Signer = {
      publicKey: publicKeyBuffer,
      signatureType: 1,
      signatureLength: 512,
      ownerLength: 512,
      sign: this.api.getSignerSignFn(sub),
      // Note we don't provide `verify` as it's not used anyway:
      // verify: null,
    };

    addOthentAnalyticsTags(transaction);

    // Using transaction.tags won't work as those wound still be encoded:
    const tags = (transaction.get("tags") as unknown as Tag[]).map((tag) => ({
      name: tag.get("name", { decode: true, string: true }),
      value: tag.get("value", { decode: true, string: true }),
    }));

    const dateItem = createData(transaction.data, signer, { tags });

    // DataItem.sign() sets the DataItem's `id` property and returns its `rawId`:
    await dateItem.sign(signer);

    try {
      // TODO: Try with a bunch of different nodes?

      const res = await fetch(`${options?.node || DEFAULT_DISPATCH_NODE}/tx`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: Buffer.from(dateItem.getRaw()),
      });

      if (res.status >= 400) {
        throw new Error(
          `Error uploading DataItem: ${res.status} ${res.statusText}`,
        );
      }

      return {
        // TODO: Should we return the dataItem itself as well?
        id: await dateItem.id,
      };
    } catch {
      await this.sign(transaction);

      const arweave = options?.arweave ?? Arweave.init(this.gatewayConfig);

      const uploader = await arweave.transactions.getUploader(transaction);

      while (!uploader.isComplete) {
        await uploader.uploadChunk();
      }

      return {
        id: transaction.id,
      };
    }
  }

  // ENCRYPT/DECRYPT:

  /**
   * Encrypt data with the users JWK. This function assumes (and requires) a user is logged in and a valid string to sign.
   * @param plaintext The data in string format to sign.
   * @returns The encrypted data.
   */
  async encrypt(plaintext: string | BinaryDataType): Promise<Uint8Array> {
    const sub = this.auth0.getCachedUserSub();

    if (!sub) throw new Error("Missing cached user.");

    const ciphertextBuffer = await this.api.encrypt(plaintext, sub);

    return ciphertextBuffer;
  }

  /**
   * Decrypt data with the users JWK. This function assumes (and requires) a user is logged in and a valid encrypt() response.
   * @param ciphertext The data to decrypt.
   * @returns The decrypted data.
   */
  async decrypt(ciphertext: string | BinaryDataType): Promise<string> {
    const sub = this.auth0.getCachedUserSub();

    if (!sub) throw new Error("Missing cached user.");

    const plaintext = await this.api.decrypt(ciphertext, sub);

    return plaintext;
  }

  // SIGN:

  // TODO: Add deprecation warning (and update all TSDocs according to what's on ArConnect and add references to their docs).

  /**
   * Generate a signature. This function assumes (and requires) a user is logged in.
   * @param data The data to sign.
   * @returns The {@linkcode Buffer} format of the signature.
   */
  async signature(data: string | BinaryDataType): Promise<Uint8Array> {
    const sub = this.auth0.getCachedUserSub();

    if (!sub) throw new Error("Missing cached user.");

    const signatureBuffer = await this.api.sign(data, sub);

    return signatureBuffer;
  }

  /**
   * The signDataItem() function allows you to create and sign a data item object, compatible with arbundles. These data items can then be submitted to an ANS-104 compatible bundler.
   * @param dataItem The data to sign.
   * @returns The signed data item.
   */
  async signDataItem(dataItem: DataItem): Promise<Buffer> {
    const publicKeyBuffer = this.auth0.getCachedUserPublicKeyBuffer();
    const sub = this.auth0.getCachedUserSub();

    if (!publicKeyBuffer || !sub) throw new Error("Missing cached user.");

    const { data, ...options } = dataItem;

    const signer: Signer = {
      publicKey: publicKeyBuffer,
      signatureType: 1,
      signatureLength: 512,
      ownerLength: 512,
      sign: this.api.getSignerSignFn(sub),
      // Note we don't provide `verify` as it's not used anyway:
      // verify: null,
    };

    const opts: DataItemCreateOptions = {
      ...options,
      tags: [...(options.tags || []), ...ANALYTICS_TAGS],
    };

    const dataItemInstance = createData(data, signer, opts);

    // DataItem.sign() sets the DataItem's `id` property and returns its `rawId`:
    await dataItemInstance.sign(signer);

    // TODO: ArConnects types the return type as ArrayBuffer, but in the example this goes straight into the DataItem constructor, which only accepts Buffer.
    // new DataItem(dataItemInstance.getRaw().buffer);
    // return dataItemInstance.getRaw().buffer;
    return dataItemInstance.getRaw();
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
    const sub = this.auth0.getCachedUserSub();

    if (!sub) throw new Error("Missing cached user.");

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
    publicKey?: string,
    options: SignMessageOptions = { hashAlgorithm: "SHA-256" },
  ): Promise<boolean> {
    const n = publicKey ?? this.auth0.getCachedUserPublicKey();

    if (!n) throw new Error("Missing public key.");

    const hashAlgorithm = options?.hashAlgorithm || "SHA-256";

    const hashArrayBuffer = await this.crypto.subtle.digest(
      hashAlgorithm,
      binaryDataTypeOrStringToBinaryDataType(data),
    );

    const publicJWK: JsonWebKey = {
      e: "AQAB",
      ext: true,
      kty: "RSA",
      n,
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

  async privateHash(
    data: string | BinaryDataType,
    options: SignMessageOptions,
  ): Promise<Uint8Array> {
    const sub = this.auth0.getCachedUserSub();

    if (!sub) throw new Error("Missing cached user.");

    return hash(
      binaryDataTypeOrStringToBinaryDataType(data),
      options.hashAlgorithm,
    );
  }

  // MISC.:

  getArweaveConfig() {
    return Promise.resolve(this.gatewayConfig satisfies GatewayConfig);
  }

  getPermissions(): Promise<PermissionType[]> {
    return Promise.resolve([
      "ACCESS_ADDRESS",
      "ACCESS_PUBLIC_KEY",
      "ACCESS_ALL_ADDRESSES",
      "SIGN_TRANSACTION",
      "ENCRYPT",
      "DECRYPT",
      "SIGNATURE",
      // "ACCESS_ARWEAVE_CONFIG",
      "DISPATCH",
    ]);
  }
}
