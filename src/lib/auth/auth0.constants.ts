import { Auth0Provider, Auth0ProviderLabel } from "./auth0.types";

export const PROVIDER_LABELS: Record<Auth0Provider, Auth0ProviderLabel> = {
  apple: "Apple",
  auth0: "E-Mail",
  "google-oauth2": "Google",

  // TODO: Complete these values:
  "<Twitch>": "Twitch",
  twitter: "X",
  "<Meta>": "Meta",
  "<LinkedIn>": "LinkedIn",
  github: "GitHub",
};

export const CRYPTO_OPERATION_BINARY_DATA_KEYS = [
  "wrappedSignKey",
  "wrappedEncryptDecryptKey",
  "data",
  "plaintext",
  "ciphertext",
] as const;
