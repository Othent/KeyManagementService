import { Auth0Client, CacheLocation, createAuth0Client } from "@auth0/auth0-spa-js";
import { toBuffer } from "../utils/bufferUtils";
import { jwtDecode } from "jwt-decode";
import {
  UserDetailsReturnProps,
  DecodedJWT,
  CryptoOperationData,
  AuthorizationParams,
  AuthorizationParamsWithTransactionInput,
  Auth0Strategy,
} from "./auth0.types";

export class OthentAuth0Client {
  auth0ClientPromise: Promise<Auth0Client | null> = Promise.resolve(null);

  isInitialized = false;

  userDetails: UserDetailsReturnProps | null = null;

  static isUserValid(
    user: DecodedJWT | UserDetailsReturnProps,
  ): user is UserDetailsReturnProps {
    return !!(
      user &&
      "authSystem" in user &&
      user.authSystem === "KMS" &&
      user.owner &&
      user.walletAddress
    );
  }

  static getAuthorizationParams(
    authorizationParams?: AuthorizationParams,
  ): AuthorizationParamsWithTransactionInput;
  static getAuthorizationParams(
    data?: CryptoOperationData,
  ): AuthorizationParamsWithTransactionInput;
  static getAuthorizationParams(
    authorizationParamsOrData: AuthorizationParams | CryptoOperationData = {},
  ): AuthorizationParamsWithTransactionInput {
    const { authorizationParams, data } =
      authorizationParamsOrData.hasOwnProperty("keyName")
        ? {
            authorizationParams: null,
            data: authorizationParamsOrData as CryptoOperationData,
          }
        : {
            authorizationParams:
              authorizationParamsOrData as AuthorizationParams,
            data: null,
          };

    return {
      ...authorizationParams,
      // TODO: We probably want to include the SDK and the API version here as we might want to deprecate the old one once
      // unused (the one where files are embedded in the token).
      transaction_input: JSON.stringify(
        data ? { othentFunction: "KMS", data } : { othentFunction: "KMS" },
      ),
    } satisfies AuthorizationParamsWithTransactionInput;
  }

  constructor(domain: string, clientId: string, strategy: Auth0Strategy) {
    // TODO: Should we be able to provide `userDetails` from a cookie or localStorage or whatever?

    const useRefreshTokens = strategy !== 'iframe-cookies';
    const cacheLocation: CacheLocation | undefined = (useRefreshTokens ? strategy.replace('refresh-', '') : "memory") as CacheLocation;

    console.log('useRefreshTokens =', useRefreshTokens);
    console.log('   cacheLocation =', cacheLocation);

    this.auth0ClientPromise = createAuth0Client({
      domain,
      clientId,
      useRefreshTokens,
      cacheLocation,
      authorizationParams: {
        redirect_uri: window.location.origin,
        // scope: "openid profile email offline_access"
      },
    });
  }

  async init() {
    await this.auth0ClientPromise;

    this.isInitialized = true;
  }

  // Wrappers around Auth0's native client with some additional functionality:

  async getTokenSilently(data?: CryptoOperationData) {
    const auth0Client = await this.auth0ClientPromise;

    if (!auth0Client) throw new Error("Missing Auth0 Client");

    console.log("getTokenSilently");

    const authorizationParams = OthentAuth0Client.getAuthorizationParams(data);

    const getTokenSilentlyResponse = await auth0Client.getTokenSilently({
      detailedResponse: true,
      authorizationParams,
      cacheMode: "off", // Forces the client to get a new token, as we actually include data in them, it cannot be done any other way.
    });

    const decoded_JWT: DecodedJWT = jwtDecode(
      getTokenSilentlyResponse.id_token,
    );

    console.log("decoded_JWT =", { ...decoded_JWT });

    delete decoded_JWT.nonce;
    delete decoded_JWT.sid;
    delete decoded_JWT.aud;
    delete decoded_JWT.iss;
    delete decoded_JWT.iat;
    // TODO: Expiration should still be there:
    delete decoded_JWT.exp;
    delete decoded_JWT.updated_at;
    // TODO: Removed data too as this is called to encode different information:
    delete decoded_JWT.data;

    this.userDetails = OthentAuth0Client.isUserValid(decoded_JWT)
      ? decoded_JWT
      : null;

    // TODO: Logout if user is invalid?

    return {
      ...getTokenSilentlyResponse,
      idTokenData: decoded_JWT,
    };
  }

  async logIn() {
    const auth0Client = await this.auth0ClientPromise;

    if (!auth0Client) throw new Error("Missing Auth0 Client");

    console.log("LOGIN");

    // TODO: Prevent multiple calls here? These 2 calls are probably not needed:

    const isAuthenticated = await auth0Client.isAuthenticated();

    console.log("login.isAuthenticated =", isAuthenticated);

    if (isAuthenticated) {
      throw new Error("Already logged in");
    }

    // TODO: This seems to be duplicated with what's inside userDetails:

    // TODO: Also review what's the relationship between these and the privatization Rule in Auth0.

    /*
    const processDecodedJWT = async (decoded_JWT: DecodedJWT): Promise<any> => {
      const fieldsToDelete = [
        "nonce",
        "sid",
        "aud",
        "iss",
        "iat",
        "exp",
        "updated_at",
      ];
      fieldsToDelete.forEach(
        (field) => delete decoded_JWT[field as keyof DecodedJWT],
      );
      return decoded_JWT;
    };
    */

    console.log("loginWithPopup");

    // This can throw if the popup is close by the user or if we try to open it before the user interacts with the page.
    // In both cases, that's handled in the parent `Othent.connect()`:

    await auth0Client.loginWithPopup({
      authorizationParams: OthentAuth0Client.getAuthorizationParams({
        redirect_uri: window.location.origin,
      }),
    });

    return this.getTokenSilently();

    // TODO: Store user data (not token) locally with token's expiration date?
    // localStorage.setItem("id_token", accessToken.id_token);
  }

  async logOut() {
    const auth0Client = await this.auth0ClientPromise;

    if (!auth0Client) throw new Error("Missing Auth0 Client");

    this.userDetails = null;

    return auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }

  async encodeToken(data?: CryptoOperationData) {
    const accessToken = await this.getTokenSilently(data);

    // TODO: Using ID tokens might not be the recommended thing to do?
    return accessToken.id_token;
  }

  // Getters for cached user data:

  // TODO: Validate expiration.

  getCachedUserDetails(): UserDetailsReturnProps | null {
    return this.userDetails;
  }

  getCachedUserPublicKey() {
    // return userDetails ? toBuffer(userDetails.owner) : null;
    return this.userDetails?.owner || null;
  }

  getCachedUserPublicKeyBuffer() {
    // TODO: This toBuffer() returns a base64 buffer, but where is that defined / specified, as otherwise we could also
    // do `new TextEncoder().encode(string)`, but the results are different.
    return this.userDetails ? toBuffer(this.userDetails.owner) : null;
  }

  getCachedUserSub() {
    return this.userDetails?.sub || null;
  }

  getCachedUserAddress() {
    return this.userDetails?.walletAddress || null;
  }

  getCachedUserEmail() {
    return this.userDetails?.email || null;
  }
}
