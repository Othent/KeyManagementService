import { AuthorizationParams as Auth0AuthorizationParams } from "@auth0/auth0-spa-js";
import { JwtPayload } from "jwt-decode";

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
  emailVerified: string;
  expiration: number;

  // Custom from Auth0's Add User Metadata action:
  owner: string; // Public key derived from `sub`.
  walletAddress: string; // Wallet address derived from `owner`.
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
  email_verified: string;
  nonce: string;
  name: string;
  sid: string;

  // Custom from Auth0's Add User Metadata action:
  owner: string; // Public key derived from `sub`.
  walletAddress: string; // Wallet address derived from `owner`.
  authSystem: "KMS";

  // Extra data also added to the token in Add User Metadata action when calling functions other than createUser:
  data: void extends D ? never : D;
}

// JWT token data / encodeToken():

export interface BaseCryptoOperationData {
  keyName: string;
}

export interface SignOperationData extends BaseCryptoOperationData {
  data: string;
}

export interface EncryptOperationData extends BaseCryptoOperationData {
  plaintext: string;
}

export interface DecryptOperationData extends BaseCryptoOperationData {
  ciphertext: string;
}

export type CryptoOperationData =
  | SignOperationData
  | EncryptOperationData
  | DecryptOperationData;
