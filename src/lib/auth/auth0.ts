import {
  Auth0Client,
  createAuth0Client,
  GetTokenSilentlyVerboseResponse,
} from "@auth0/auth0-spa-js";
import { CustomAuthParams } from "../../types/auth/auth0";

export const getAuth0Client = (): Promise<Auth0Client> =>
  createAuth0Client({
    domain: "auth.othent.io",
    clientId: "dyegx4dZj5yOv0v0RkoUsc48CIqaNS6C",
    authorizationParams: {
      redirect_uri: window.location.origin,
    },
  });

export function getTokenSilently(
  auth0: Auth0Client,
  authParams: CustomAuthParams,
): Promise<GetTokenSilentlyVerboseResponse> {
  return auth0.getTokenSilently({
    detailedResponse: true,
    authorizationParams: authParams,
    cacheMode: "off",
  });
}
