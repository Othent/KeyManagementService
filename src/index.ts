import { Buffer } from "buffer";
import { OthentAuth0Client } from "./lib/auth/auth0";
import Transaction from "arweave/web/lib/transaction";
import { addOthentAnalyticsTags } from "./lib/analytics/analytics.utils";
import type Arweave from "arweave/web";
import { bufferTob64Url, hash, stringToBuffer } from "./lib/utils/arweaveUtils";
import { createData, DataItemCreateOptions, Signer } from "warp-arbundles";
import { OthentKMSClient } from "./lib/othent-kms-client/client";
import { DecodedJWT, UserDetailsReturnProps } from "./lib/auth/auth0.types";

// Old type exports:
// export * from "./types/mapping/connect";

// Polyfill. Should we overwrite a global like this from a library?
window.Buffer = Buffer;

// TODO: Break the build if the env variables are missing:
// if (
//   !process.env.auth0ClientDomain ||
//   !process.env.auth0ClientId ||
//   !process.env.kmsServerBaseUrl
// ) {
//   process.exit(1);
// }

// TODO: Export all types (auth, data, etc.)

interface OthentConfig {
  auth0Domain: string;
  auth0ClientId: string;
  auth0UseRefreshTokens: boolean;
  serverBaseURL: string;
}

interface OthentOptions extends Partial<OthentConfig> {
  crypto?: Crypto | null;
}

// type BufferSource = ArrayBuffer | TypedArray | DataView;

export class Othent {
  // TODO: Update with production defaults (as env variables do not work):
  config: OthentConfig = {
    auth0Domain: process.env.auth0ClientDomain || "gmzcodes-test.eu.auth0.com",
    auth0ClientId: "RSEz2IKqExKJTMqJ1crVSqjBT12ZgsfW",
    auth0UseRefreshTokens: false,
    serverBaseURL: process.env.kmsServerBaseUrl || "http://localhost:3010",
  };

  crypto: Crypto;

  api: OthentKMSClient;

  auth0: OthentAuth0Client;

  // TODO: Add listener for user details change?

  // TODO: Add listener for errors and a silentErrors: boolean property?

  constructor(options: OthentOptions = {}) {
    let { crypto: cryptoOption, ...configOptions } = options;

    this.config = { ...configOptions, ...this.config };

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
      this.config.auth0UseRefreshTokens,
    );

    this.api = new OthentKMSClient(this.config.serverBaseURL, this.auth0);

    if (process.env.NODE_ENV === "development") {
      console.log(this.config);
    }
  }

  async init() {
    await this.auth0.init();
  }

  // CONNECT / DISCONNECT:

  /**
   * Connect the users account, this is the same as login/signup in one function.
   * @returns The the users details.
   */
  async connect(): Promise<UserDetailsReturnProps | null> {
    // Call `getTokenSilently()` to reconnect if we still have a valid token / session.
    //
    // - If we do, `getTokenSilently()` returns the user data.
    // - If we don't, it throws a `Login required` error.

    let idToken = '';
    let user: DecodedJWT | UserDetailsReturnProps | null = null;

    try {
      const { id_token, idTokenData } = await this.auth0.getTokenSilently();

      idToken = id_token;
      user = idTokenData;
    } catch (err) {
      // If we get an error other than `Login required`, we throw it:
      if (!(err instanceof Error) || err.message !== 'Login required') throw err;
    }

    if (!user) {
      try {
        // If we made it this far but we don't have an user, we need to log in, so we call `logIn()`. If everything goes
        // well, `logIn()` will internally call `getTokenSilently()` again after successful authentication, and return a
        // valid token with the user data:

        const { id_token, idTokenData } = await this.auth0.logIn();

        idToken = id_token;
        user = idTokenData;

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

        if (err.message === 'Popup closed' || err.message.startsWith('Unable to open a popup for loginWithPopup')) {
          console.warn(err.message);

          return null;
        }
      }
    }

    // At this point, we should have a valid token (and user). Otherwise, something unexpected happened, so we throw:
    if (!idToken || !user) throw new Error('Unexpected authentication error');

    // If everything went well, we just need to validate that the user we got has the custom `user_metadata` fields and return it:
    if (user && OthentAuth0Client.isUserValid(user)) return user;

    // If that's not the case, we need to update the user in Auth0 calling our API. Note that we pass the last token we
    // got to it to avoid making another call to `encodeToken()`, which calls `getTokenSilently()`.
    await this.api.createUser(idToken);

    // Lastly, we request a new token to update the cached user details and confirm that the `user_metadata` has been
    // correctly updated:

    try {
      const { idTokenData } = await this.auth0.getTokenSilently();

      user = idTokenData;
    } catch (err) {
      throw new Error('Unexpected authentication error');
    }

    if (user && OthentAuth0Client.isUserValid(user)) return user;

    throw new Error('User creation error');
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
        ? [
            {
              [address]: addressName,
            },
          ]
        : [],
    );
  }

  /**
   * Get user details. This function assumes (and requires) a user is logged in.
   * @returns The user's details.
   */
  getSyncUserDetails() {
    return this.auth0.getCachedUserDetails();
  }

  // TODO: Also export getSub and getPublicKeyAsBuffer?

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

    const signature = await this.api.sign(dataToSign, sub);

    const rawSignature = stringToBuffer(signature);

    let id = await hash(rawSignature);

    transaction.setSignature({
      id: bufferTob64Url(id),
      owner: publicKey,
      signature: bufferTob64Url(rawSignature),
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
    arweave: Arweave,
    node?: string,
  ): Promise<{ id: string }> {
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

    /*
    // TODO: Check if this is needed:

    const data = transaction.get("data", { decode: true, string: false });

    const tags = (transaction.get("tags") as Tag[]).map((tag) => ({
      name: tag.get("name", { decode: true, string: true }),
      value: tag.get("value", { decode: true, string: true }),
    }));
    */

    const { data, tags } = transaction;
    const dataEntry = createData(data, signer, { tags });

    try {
      // TODO: Is this actually doing something?
      // This sets DataItem.id and returns rawId
      await dataEntry.sign(signer);
    } catch (error) {
      console.log(error);
    }

    try {
      // TODO: Try with a bunch of different nodes?
      if (!node) {
        node = "https://turbo.ardrive.io";
      }

      const res = await fetch(`${node}/tx`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: Buffer.from(dataEntry.getRaw()),
      });

      if (res.status >= 400) {
        throw new Error(
          `Error uploading DataItem: ${res.status} ${res.statusText}`,
        );
      }

      return {
        id: await dataEntry.id,
      };
    } catch {
      await this.sign(transaction);
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
  async encrypt(
    plaintext: Uint8Array | string,
  ): Promise<Uint8Array | string | null> {
    const sub = this.auth0.getCachedUserSub();

    if (!sub) throw new Error("Missing cached user.");

    const encryptedData = await this.api.encrypt(plaintext, sub);

    // TODO: Convert to the right type:
    return encryptedData;
  }

  /**
   * Decrypt data with the users JWK. This function assumes (and requires) a user is logged in and a valid encrypt() response.
   * @param ciphertext The data to decrypt.
   * @returns The decrypted data.
   */
  async decrypt(
    ciphertext: Uint8Array | string,
  ): Promise<Uint8Array | string | null> {
    const sub = this.auth0.getCachedUserSub();

    if (!sub) throw new Error("Missing cached user.");

    const decryptedData = await this.api.decrypt(ciphertext, sub);

    // TODO: Convert to the right type:
    return decryptedData;
  }

  // SIGN:

  // TODO: Add deprecation warning (and update all TSDocs according to what's on ArConnect and add references to their docs).

  /**
   * Generate a signature. This function assumes (and requires) a user is logged in.
   * @param data The data to sign.
   * @returns The {@linkcode Buffer} format of the signature.
   */
  async signature(data: Uint8Array | string): Promise<Uint8Array> {
    const sub = this.auth0.getCachedUserSub();

    if (!sub) throw new Error("Missing cached user.");

    const signature = await this.api.sign(data, sub);

    const rawSignature = stringToBuffer(signature);

    return rawSignature;
  }

  /**
   * The signDataItem() function allows you to create and sign a data item object, compatible with arbundles. These data items can then be submitted to an ANS-104 compatible bundler.
   * @param dataItem The data to sign.
   * @returns The signed data item.
   */
  async signDataItem(dataItemCreateOptions: DataItemCreateOptionsWithData) {
    const publicKeyBuffer = this.auth0.getCachedUserPublicKeyBuffer();
    const sub = this.auth0.getCachedUserSub();

    if (!publicKeyBuffer || !sub) throw new Error("Missing cached user.");

    const { data, ...options } = dataItemCreateOptions;

    const signer: Signer = {
      publicKey: publicKeyBuffer,
      signatureType: 1,
      signatureLength: 512,
      ownerLength: 512,
      sign: this.api.getSignerSignFn(sub),
      // Note we don't provide `verify` as it's not used anyway:
      // verify: null,
    };

    // TODO: Add tags here too
    // addOthentAnalyticsTags(transaction);

    const dataItem = createData(data, signer, options);

    try {
      // DataItem.sign() sets the DataItem's `id` property and returns its `rawId`:
      await dataItem.sign(signer);
    } catch (error) {
      // TODO: Throw!
      console.log(error);
    }

    return dataItem.getRaw();
  }

  /**
   * Sign the given message. This function assumes (and requires) a user is logged in.
   * @param message The message to sign.
   * @returns The signed version of the message.
   */
  async signMessage(
    // TODO: ArConnect has ArrayBuffer here, but it's not consistent with the README and the code snippets.
    data: Uint8Array,
    options?: SignMessageOptions,
  ): Promise<Uint8Array> {
    const sub = this.auth0.getCachedUserSub();

    if (!sub) throw new Error("Missing cached user.");

    const hashAlgorithm = options?.hashAlgorithm || "SHA-256";

    // TODO: Make data: Uint8Array | string | null | ArrayBuffer?
    // TODO: Use TextEncoder here rather than making users use it manually?

    const hash = new Uint8Array(
      // TODO: Check with Mathias: Is this standard? Can a message signed with Othent get verified with ArConnect?
      await this.crypto.subtle.digest(hashAlgorithm, data),
    );

    const signature = await this.api.sign(hash, sub);

    return stringToBuffer(signature);
  }

  /**
   * Verify the given message. This function assumes (and requires) a user is logged in.
   * @param signature The signature to verify.
   * @returns The signed version of the message.
   */
  async verifyMessage(
    // TODO: ArConnect has ArrayBuffer here, but it's not consistent with the README and the code snippets.
    data: Uint8Array,
    // TODO: ArConnect has ArrayBuffer here, but it's not consistent with the README and the code snippets.
    signature: Uint8Array | string,
    publicKey: string,
    options: SignMessageOptions = { hashAlgorithm: "SHA-256" },
  ): Promise<boolean> {
    const hashAlgorithm = options?.hashAlgorithm || "SHA-256";

    const hash = new Uint8Array(
      await this.crypto.subtle.digest(hashAlgorithm, data),
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
      typeof signature === 'string' ? stringToBuffer(signature) : signature,
      hash,
    );

    return result;
  }
}

// TODO: Move elsewhere:

export interface DataItemCreateOptionsWithData extends DataItemCreateOptions {
  data: string | Uint8Array;
}

export interface SignMessageOptions {
  hashAlgorithm?: "SHA-256" | "SHA-384" | "SHA-512";
}

// TODO: Create a type for ArConnect (or import) and use satisfy or implements to check everything matches!
