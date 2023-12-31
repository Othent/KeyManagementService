import {
  Auth0Client,
  createAuth0Client,
  GetTokenSilentlyVerboseResponse,
} from "@auth0/auth0-spa-js";
import { CustomAuthParams } from "../../types/auth/auth0";

export const getAuth0Client = (): Promise<Auth0Client> =>
  createAuth0Client({
    domain: "auth.othent.io",
    clientId: "uXkRmJoIa0NfzYgYEDAgj6Rss4wR1tIc",
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
