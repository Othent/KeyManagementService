import {
  Auth0Client,
  CacheLocation,
  createAuth0Client,
} from "@auth0/auth0-spa-js";
import { toBuffer } from "../utils/bufferUtils";
import {
  CryptoOperationData,
  AuthorizationParams,
  AuthorizationParamsWithTransactionInput,
  Auth0Strategy,
  IdTokenWithData,
  UserDetails,
  AuthListener,
} from "./auth0.types";
import { DEFAULT_REFRESH_TOKEN_EXPIRATION_MS } from "../config/config.constants";
import { EventListenersHandler } from "../events/event-listener-handler";

export class OthentAuth0Client {

  private auth0ClientPromise: Promise<Auth0Client | null> = Promise.resolve(null);

  private authEventListenerHandler = new EventListenersHandler<AuthListener>({ diffParams: true  });

  private isInitialized = false;

  private userDetails: UserDetails | null = null;

  static isUserValid<D>(
    idTokenOrUser: IdTokenWithData<D> | UserDetails,
  ): boolean {
    // Note that we are not using the ID Token `exp` field, which is typically 24 hours. We don't care about that value
    // as refresh tokens have a much longer expiration, 15 days typically.

    const now = Date.now();

    const expiration =
      (idTokenOrUser as UserDetails).expiration ||
      now + DEFAULT_REFRESH_TOKEN_EXPIRATION_MS;

    return !!(
      idTokenOrUser &&
      idTokenOrUser.sub &&
      idTokenOrUser.owner &&
      idTokenOrUser.walletAddress &&
      idTokenOrUser.authSystem === "KMS" &&
      expiration > now
    );
  }

  static getUserDetails<D>(idToken: IdTokenWithData<D>): UserDetails {
    return {
      sub: idToken.sub || "",
      name: idToken.name,
      givenName: idToken.given_name,
      familyName: idToken.family_name,
      nickname: idToken.nickname,
      picture: idToken.picture,
      locale: idToken.locale,
      email: idToken.email,
      emailVerified: idToken.email_verified,
      expiration: Date.now() + DEFAULT_REFRESH_TOKEN_EXPIRATION_MS,
      owner: idToken.owner,
      walletAddress: idToken.walletAddress,
      authSystem: idToken.authSystem,
    };
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

    const replacer = (key: string, value: any) => {
      let bufferValues: number[] = [];

      if (
        value instanceof Buffer ||
        value instanceof DataView ||
        ArrayBuffer.isView(value)
      ) {
        bufferValues = Array.from(new Uint8Array(value.buffer));
      } else if (value instanceof ArrayBuffer) {
        bufferValues = Array.from(new Uint8Array(value));
      } else {
        return value;
      }

      // if key === 'data' then we are signing else we are encrypting / decrypting
      return key === "data"
        ? Object.fromEntries(Object.entries(bufferValues))
        : {
            type: "Buffer",
            data: bufferValues,
          };
    };

    return {
      ...authorizationParams,
      // TODO: We probably want to include the SDK and the API version here as we might want to deprecate the old one once
      // unused (the one where files are embedded in the token).
      transaction_input: JSON.stringify(
        data ? { othentFunction: "KMS", data } : { othentFunction: "KMS" },
        replacer,
      ),
    } satisfies AuthorizationParamsWithTransactionInput;
  }

  constructor(domain: string, clientId: string, strategy: Auth0Strategy) {
    // TODO: Should we be able to provide an initial value for `userDetails` from a cookie / localStorage / sessionStorage or whatever?

    const useRefreshTokens = strategy !== "iframe-cookies";

    const cacheLocation: CacheLocation | undefined = (
      useRefreshTokens ? strategy.replace("refresh-", "") : "memory"
    ) as CacheLocation;

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

  private updateUserDetails<D>(
    idToken: IdTokenWithData<D> | null,
  ): UserDetails | null {
    let nextUserDetails: UserDetails | null = null;

    if (idToken) {
      nextUserDetails = OthentAuth0Client.isUserValid(idToken)
        ? OthentAuth0Client.getUserDetails(idToken)
        : null;
    }

    this.authEventListenerHandler.emit(nextUserDetails);

    // TODO: Update in localStorage / cookie for cross-tab synching / SSR?

    // TODO: Add a timer to remove the user details once they expire.

    return (this.userDetails = nextUserDetails);
  }

  async init() {
    await this.auth0ClientPromise;

    // TODO: Remove?
    this.isInitialized = true;
  }

  // Getters:

  getAuthEventListenerHandler() {
    return this.authEventListenerHandler;
  }

  // Wrappers around Auth0's native client with some additional functionality:

  async getTokenSilently(data?: CryptoOperationData) {
    const auth0Client = await this.auth0ClientPromise;

    if (!auth0Client) throw new Error("Missing Auth0 Client");

    const authorizationParams = OthentAuth0Client.getAuthorizationParams(data);

    if (process.env.NODE_ENV === "development") {
      try {
        console.log("getTokenSilently() =", {
          ...authorizationParams,
          transaction_input: JSON.parse(authorizationParams.transaction_input),
        });
      } catch (err) {
        console.error("Error logging/parsing `authorizationParams`:", err);
      }
    }

    const getTokenSilentlyResponse = await auth0Client.getTokenSilently({
      detailedResponse: true,
      authorizationParams,
      cacheMode: "off", // Forces the client to get a new token, as we actually include data in them, it cannot be done any other way.
    });

    const idToken = await auth0Client.getUser<IdTokenWithData>();

    // No need for the `jwtDecode()` function/library as Auth0 provides this as `getUser()`.
    // const idToken = jwtDecode<IdTokenWithData>(getTokenSilentlyResponse.id_token);

    if (!idToken) throw new Error("Could not get the user's details");

    const userDetails = this.updateUserDetails(idToken);

    return {
      ...getTokenSilentlyResponse,
      idToken,
      userDetails,
    };
  }

  async logIn() {
    const auth0Client = await this.auth0ClientPromise;

    if (!auth0Client) throw new Error("Missing Auth0 Client");

    if (process.env.NODE_ENV === "development") console.log("logIn()");

    const isAuthenticated = await auth0Client.isAuthenticated();

    if (isAuthenticated) {
      throw new Error("Already logged in");
    }

    // This can throw if the popup is close by the user or if we try to open it before the user interacts with the page.
    // In both cases, that's handled in the parent `Othent.connect()`:

    await auth0Client.loginWithPopup({
      authorizationParams: OthentAuth0Client.getAuthorizationParams({
        redirect_uri: window.location.origin,
      }),
    });

    return this.getTokenSilently();
  }

  async logOut() {
    const auth0Client = await this.auth0ClientPromise;

    if (!auth0Client) throw new Error("Missing Auth0 Client");

    if (process.env.NODE_ENV === "development") console.log("logOut()");

    this.updateUserDetails(null);

    return auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }

  async encodeToken(data?: CryptoOperationData) {
    const accessToken = await this.getTokenSilently(data);

    return accessToken.id_token;
  }

  // Getters for cached user data:

  getCachedUserDetails(): UserDetails | null {
    return this.userDetails;
  }

  getCachedUserPublicKey() {
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
