import {
  AuthorizationParams as Auth0AuthorizationParams,
  User,
} from "@auth0/auth0-spa-js";
import { B64UrlString, BinaryDataType } from "../utils/arweaveUtils";
import type { JwtPayload } from "jwt-decode";
import { RemoveIndexSignature } from "../../types/utils/type-utils.types";

// Auth0:

export type AuthListener = (userDetails: UserDetails | null) => void;

export type Auth0Strategy =
  | "iframe-cookies"
  | "refresh-localstorage"
  | "refresh-memory";

export type AuthorizationParams =
  RemoveIndexSignature<Auth0AuthorizationParams>;

export type AuthorizationParamsWithTransactionInput = AuthorizationParams & {
  transaction_input: string;
};

// JWT data:

export interface UserDetails {
  // Default from Auth0's User:
  sub: string;
  name: string;
  givenName: string;
  middleName: string;
  familyName: string;
  nickname: string;
  preferredUsername: string;
  profile: string;
  picture: string;
  website: string;
  locale: string;
  updatedAt: string;
  email: string;
  emailVerified: boolean;

  // Default but unused from Auth0's User:
  // gender: string;
  // birthdate: string;
  // zoneinfo: string;
  // phoneNumber: string;
  // phoneNumberVerified: boolean;
  // address: string;

  // Custom from Auth0's Add User Metadata action:
  owner: B64UrlString; // Public key derived from `sub`.
  walletAddress: B64UrlString; // Wallet address derived from `owner`.
  authSystem: "KMS";
}

export interface IdTokenWithData<D = void> extends JwtPayload, User {
  // Non-default from Auth0:
  nonce: string;
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

export interface TransactionInput {
  // For Auth0-related logic and analytics:
  othentFunction: "KMS";
  othentSDKVersion: string;
  othentAPIVersion: string;

  // For App-related analytics:
  appName: string;
  appVersion: string;

  // Operation data:
  data?: CryptoOperationData;
}
