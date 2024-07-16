import { AuthorizationParams as Auth0AuthorizationParams } from "@auth0/auth0-spa-js";

// Auth0:

export type Auth0Strategy = 'iframe-cookies' | 'refresh-localstorage' | 'refresh-memory';

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

export interface DecodedJWT {
  walletAddress: string;
  owner: string;
  given_name: string;
  family_name: string;
  nickname: string;
  name: string;
  picture: string;
  locale: string;
  updated_at?: string;
  email: string;
  email_verified: boolean;
  sub: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  sid?: string;
  nonce?: string;
  data?: any;
}

export interface LoginReturnProps {
  walletAddress: string;
  owner: string;
  given_name: string;
  family_name: string;
  nickname: string;
  name: string;
  picture: string;
  locale: string;
  updated_at?: string;
  email: string;
  email_verified: string;
  sub: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  sid?: string;
  nonce?: string;
  data?: any;
}

export interface UserDetailsReturnProps {
  authSystem?: string;
  walletAddress: string;
  owner: string;
  given_name: string;
  family_name: string;
  nickname: string;
  name: string;
  picture: string;
  locale: string;
  updated_at?: string;
  email: string;
  email_verified: boolean;
  sub: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  sid?: string;
  nonce?: string;
  data?: any;
}

// JWT token dATA / encodeToken():

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
