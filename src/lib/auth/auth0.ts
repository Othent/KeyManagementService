import {
  Auth0Client,
  createAuth0Client,
  GetTokenSilentlyVerboseResponse,
} from "@auth0/auth0-spa-js";
import { CustomAuthParams } from "../../types/auth/auth0";
import { jwtDecode } from "jwt-decode";
import { DecodedJWT } from "../../types/auth/login";
import { UserDetailsReturnProps } from "../../types/auth/userDetails";
import { toBuffer } from "../utils/bufferUtils";
import { isUserValid } from "./validateUser";

let auth0Client: Auth0Client | null = null;

export async function getAuth0Client(): Promise<Auth0Client> {
  if (!auth0Client) {
    const newAuth0Client = await createAuth0Client({
      domain: "auth.othent.io",
      clientId: "uXkRmJoIa0NfzYgYEDAgj6Rss4wR1tIc",
      // useRefreshTokens: true,
      authorizationParams: {
        redirect_uri: window.location.origin,
        // scope: "openid profile email offline_access"
      },
    });

    auth0Client = newAuth0Client;
  }

  return auth0Client;
}

let userDetails: UserDetailsReturnProps | null = null;

// TODO: No need to pass the client if it's already initialized!

export async function getTokenSilently(
  auth0: Auth0Client,
  authParams?: CustomAuthParams,
): Promise<GetTokenSilentlyVerboseResponse> {
  console.log("getTokenSilently");

  const authorizationParams = authParams ?? {
    transaction_input: JSON.stringify({ othentFunction: "KMS" }),
  };

  const getTokenSilentlyResponse = await auth0.getTokenSilently({
    detailedResponse: true,
    authorizationParams,
    cacheMode: "off",
  });

  const decoded_JWT: DecodedJWT = jwtDecode(getTokenSilentlyResponse.id_token);

  delete decoded_JWT.nonce;
  delete decoded_JWT.sid;
  delete decoded_JWT.aud;
  delete decoded_JWT.iss;
  delete decoded_JWT.iat;
  delete decoded_JWT.exp;
  delete decoded_JWT.updated_at;
  // TODO: Removed data too as this is called to encode different information:
  delete decoded_JWT.data;

  userDetails = isUserValid(decoded_JWT) ? decoded_JWT : null;

  console.log(
    "getTokenSilentlyResponse =",
    getTokenSilentlyResponse,
    decoded_JWT,
  );

  // TODO: Logout if user is invalid?

  return getTokenSilentlyResponse;
}

export function getCachedUserDetails(): UserDetailsReturnProps | null {
  // TODO: Validate expiration and make sure this is only called after initialization?
  return userDetails;
}

export function getCachedUserPublicKey() {
  // return userDetails ? toBuffer(userDetails.owner) : null;
  return userDetails?.owner || null;
}

export function getCachedUserPublicKeyBuffer() {
  return userDetails ? toBuffer(userDetails.owner) : null;
}

export function getCachedUserSub() {
  return userDetails?.sub || null;
}

export function getCachedUserAddress() {
  return userDetails?.walletAddress || null;
}

export function getCachedUserEmail() {
  return userDetails?.email || null;
}
