import { AuthorizationParams as Auth0AuthorizationParams } from "@auth0/auth0-spa-js";
import { JwtPayload } from "jwt-decode";
import { B64UrlString, BinaryDataType } from "../utils/arweaveUtils";

// Auth0:

export type Auth0Strategy =
  | "iframe-cookies"
  | "refresh-localstorage"
  | "refresh-memory";

type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]: T[K];
};

export type AuthorizationParams =
  RemoveIndexSignature<Auth0AuthorizationParams>;

export type AuthorizationParamsWithTransactionInput = AuthorizationParams & {
  transaction_input: string;
};

// JWT data:

// TODO: Extend Auth0's User type:

export interface UserDetails {
  // Default from Auth0:
  sub: string;
  name: string;
  givenName: string;
  familyName: string;
  nickname: string;
  picture: string;
  locale: string;
  email: string;
  emailVerified: boolean;
  expiration: number;

  // Custom from Auth0's Add User Metadata action:
  owner: B64UrlString; // Public key derived from `sub`.
  walletAddress: B64UrlString; // Wallet address derived from `owner`.
  authSystem: "KMS";
}

export interface IdTokenWithData<D = void> extends JwtPayload {
  // Default from Auth0:
  given_name: string;
  family_name: string;
  nickname: string;
  picture: string;
  locale: string;
  updated_at: string;
  email: string;
  email_verified: boolean;
  nonce: string;
  name: string;
  sid: string;

  // Custom from Auth0's Add User Metadata action:
  owner: B64UrlString; // Public key derived from `sub`.
  walletAddress: B64UrlString; // Wallet address derived from `owner`.
  authSystem: "KMS";

  // Extra data also added to the token in Add User Metadata action when calling functions other than createUser:
  data: void extends D ? never : D;
}

// JWT token data / encodeToken():

export interface BaseCryptoOperationData {
  keyName: string;
}

export interface SignOperationData extends BaseCryptoOperationData {
  // TODO: We should not be relaying on JSON.stringify for this, so this should be typed as just `string`:
  data: string | BinaryDataType;
}

export interface EncryptOperationData extends BaseCryptoOperationData {
  // TODO: We should not be relaying on JSON.stringify for this, so this should be typed as just `string`:
  plaintext: string | BinaryDataType;
}

export interface DecryptOperationData extends BaseCryptoOperationData {
  // TODO: We should not be relaying on JSON.stringify for this, so this should be typed as just `string`:
  ciphertext: string | BinaryDataType;
}

export type CryptoOperationData =
  | SignOperationData
  | EncryptOperationData
  | DecryptOperationData;
