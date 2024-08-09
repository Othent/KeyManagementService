import {
  AuthorizationParams as Auth0AuthorizationParams,
  User,
} from "@auth0/auth0-spa-js";
import { B64UrlString, BinaryDataType } from "../utils/arweaveUtils";
import type { JwtPayload } from "jwt-decode";
import { RemoveIndexSignature } from "../utils/typescript/type-utils.types";
import {
  AppInfo,
  Auth0Cache,
  Auth0LogInMethod,
  Auth0RedirectUri,
  Auth0Strategy,
  OthentStorageKey,
} from "../config/config.types";

// OthentAuth0Client:

export interface OthentAuth0ClientOptions {
  debug: boolean;
  domain: string;
  clientId: string;
  strategy: Auth0Strategy;
  cache: Auth0Cache;
  refreshTokenExpirationMs: number;
  loginMethod: Auth0LogInMethod;
  redirectURI: Auth0RedirectUri;
  returnToURI: Auth0RedirectUri;
  appInfo: AppInfo;
  initialUserDetails?: UserDetails | null;
  cookieKey: OthentStorageKey | null;
  localStorageKey: OthentStorageKey | null;
}

// Auth0:

export type AuthorizationParams =
  RemoveIndexSignature<Auth0AuthorizationParams>;

export type AuthorizationParamsWithTransactionInput = AuthorizationParams & {
  transaction_input: string;
};

// User JWT data:

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

// User details:

export type Auth0Provider =
  | `apple`
  | `auth0`
  | `google-oauth2`
  | `<LinkedIn>`
  | `<X>`
  | `<Meta>`
  | `<Twitch>`
  | `github`;

export type Auth0Sub = `${Auth0Provider}|(${string})`;

export type Auth0ProviderLabel =
  | `Apple`
  | `E-Mail`
  | `Google`
  | `LinkedIn`
  | `X`
  | `Meta`
  | `Twitch`
  | `GitHub`
  | `Unknown Provider`;

export type Auth0WalletAddressLabel = `${Auth0ProviderLabel} (${string})`;

export type ANSDomain = `${string}.ar`;

export type OthentWalletAddressLabel = Auth0WalletAddressLabel | ANSDomain;

export interface UserDetails {
  // Default from Auth0's User:
  sub: Auth0Sub;
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
  walletAddressLabel: OthentWalletAddressLabel;
  authSystem: "KMS";
  authProvider: Auth0Provider;
}

export interface StoredUserDetails {
  userDetails: UserDetails;
  createdAt: string;
  expiredBy: string;
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
