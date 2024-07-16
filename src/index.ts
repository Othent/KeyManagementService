import { Buffer } from "buffer";
import { OthentAuth0Client } from "./lib/auth/auth0";
import Transaction from "arweave/web/lib/transaction";
import { addOthentAnalyticsTags } from "./lib/analytics/analytics.utils";
import type Arweave from "arweave/web";
import { bufferTob64Url, hash } from "./lib/utils/arweaveUtils";
import { createData, DataItemCreateOptions, Signer } from "warp-arbundles";
import { OthentKMSClient } from "./lib/othent-kms-client/client";
import { UserDetailsReturnProps } from "./lib/auth/auth0.types";

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
  async connect(): Promise<UserDetailsReturnProps> {
    console.log("CONNECT");

    // This calls getTokenSilently
    // const user = await reconnect();

    try {
      await this.auth0.getTokenSilently();
    } catch (err) {
      console.log("RECONNECT ERROR", err);
    }

    const user = this.auth0.getCachedUserDetails();

    console.log("connect.user =", user);

    if (user) return user;

    // This also calls getTokenSilently when the popup is actually shown:
    // TODO: Add a note  about this throwing an error if we try to open a popup automatically.
    const newUser = await this.auth0.logIn();

    console.log("newUser =", newUser);

    if (newUser && OthentAuth0Client.isUserValid(newUser)) {
      console.log("User already existed in KMS.");

      return newUser;
    }

    console.log("Creating new KMS user.");

    // TODO: This calls getTokenSilently again from encodeToken, but it should not! Reuse any of the previous 2 or embed this in getTokenSilently.
    await this.api.createUser();

    // TODO: Details need to be re-requested, actually, or sent from the /create-user endpoint.
    // localStorage.setItem("id_token", JSON.stringify(userDetailsJWT));
    return this.auth0.getCachedUserDetails()!;
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

    // TODO: Before this was const signature = this.signature(dataToSign), but that function is gonna get deprecated

    const response = await this.api.sign(dataToSign, sub);

    const rawSignature = Buffer.from(response.data);

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

    return decryptedData;
  }

  // SIGN:

  // TODO: Add deprecation warning (and update all TSDocs according to what's on ArConnect and add references to their docs).

  /**
   * Generate a signature. This function assumes (and requires) a user is logged in.
   * @param data The data to sign.
   * @returns The {@linkcode Buffer} format of the signature.
   */
  async signature(data: Uint8Array | string): Promise<Buffer> {
    const sub = this.auth0.getCachedUserSub();

    if (!sub) throw new Error("Missing cached user.");

    const response = await this.api.sign(data, sub);

    const rawSignature = Buffer.from(response.data);

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
    data: Uint8Array,
    options: SignMessageOptions,
  ): Promise<number[]> {
    const hashAlgorithm = options?.hashAlgorithm || "SHA-256";

    // TODO: Make data: Uint8Array | string | null | ArrayBuffer?
    // TODO: Use TextEncoder here rather than making users use it manually?

    const dataToSign = new Uint8Array(data);

    const hash = new Uint8Array(
      // TODO: Check with Mathias: Is this standard? Can a message signed with Othent get verified with ArConnect?
      await this.crypto.subtle.digest(hashAlgorithm, dataToSign),
    );

    // TODO: Replace call to this.signature with direct call to service!!
    const signedMessage = await this.signature(hash);

    // TODO: Why did we chose to return an array instead of the Buffer?
    return Array.from(new Uint8Array(signedMessage));
  }

  /**
   * Verify the given message. This function assumes (and requires) a user is logged in.
   * @param signature The signature to verify.
   * @returns The signed version of the message.
   */
  async verifyMessage(
    data: Uint8Array,
    signature: number[],
    // TODO: This doesn't match ArConnect's signature.
    publicKey: string,
    options: SignMessageOptions = { hashAlgorithm: "SHA-256" },
  ): Promise<boolean> {
    const hashAlgorithm = options?.hashAlgorithm || "SHA-256";

    const dataToVerify = new Uint8Array(data);

    const binarySignature = new Uint8Array(signature);

    const hash = new Uint8Array(
      await this.crypto.subtle.digest(hashAlgorithm, dataToVerify),
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
      binarySignature,
      hash,
    );

    return result;
  }
}

export interface DataItemCreateOptionsWithData extends DataItemCreateOptions {
  data: string | Uint8Array;
}

export interface SignMessageOptions {
  hashAlgorithm?: "SHA-256" | "SHA-384" | "SHA-512";
}

// Create a type for ArConnect (or import) and use satisfy to check everything matches!
