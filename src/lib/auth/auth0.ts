import {
  Auth0Client,
  CacheLocation,
  createAuth0Client,
} from "@auth0/auth0-spa-js";
import {
  CryptoOperationData,
  AuthorizationParams,
  AuthorizationParamsWithTransactionInput,
  IdTokenWithData,
  UserDetails,
  TransactionInput,
} from "./auth0.types";
import {
  CLIENT_NAME,
  CLIENT_VERSION,
  DEFAULT_OTHENT_CONFIG,
} from "../config/config.constants";
import { EventListenersHandler } from "../utils/events/event-listener-handler";
import { AuthListener } from "../othent/othent.types";
import { AppInfo, Auth0Strategy } from "../config/config.types";

export class OthentAuth0Client {
  private auth0ClientPromise: Promise<Auth0Client | null> =
    Promise.resolve(null);

  private authEventListenerHandler = new EventListenersHandler<AuthListener>({
    diffParams: true,
  });

  private userDetails: UserDetails | null = null;

  private userDetailsExpirationTimeoutID = 0;

  private appInfo: AppInfo = {
    name: "",
    version: "",
  };

  private refreshTokenExpirationMs = +DEFAULT_OTHENT_CONFIG.auth0RefreshTokenExpirationMs;

  isReady = false;

  static isIdTokenValidUser<D>(idToken: IdTokenWithData<D>): boolean {
    // Note that we are not checking the ID Token `exp` field, which is typically 24 hours. We don't care about that
    // value as refresh tokens have a much longer expiration, 15 days typically.

    return !!(
      idToken &&
      idToken.sub &&
      idToken.owner &&
      idToken.walletAddress &&
      idToken.authSystem === "KMS"
    );
  }

  static getUserDetails<D>(idToken: IdTokenWithData<D>): UserDetails {
    return {
      sub: idToken.sub || "",
      name: idToken.name || "",
      givenName: idToken.given_name || "",
      middleName: idToken.middle_name || "",
      familyName: idToken.family_name || "",
      nickname: idToken.nickname || "",
      preferredUsername: idToken.preferred_username || "",
      profile: idToken.profile || "",
      picture: idToken.picture || "",
      website: idToken.website || "",
      locale: idToken.locale || "",
      updatedAt: idToken.updated_at || "",
      email: idToken.email || "",
      emailVerified: !!idToken.email_verified,
      owner: idToken.owner,
      walletAddress: idToken.walletAddress,
      authSystem: idToken.authSystem,
    };
  }

  constructor(
    domain: string,
    clientId: string,
    strategy: Auth0Strategy,
    refreshTokenExpirationMs: number,
    appInfo: AppInfo,
  ) {
    // TODO: Should we be able to provide an initial value for `userDetails` from a cookie / localStorage or whatever?

    const useRefreshTokens = strategy !== "iframe-cookies";

    const cacheLocation: CacheLocation | undefined = (
      useRefreshTokens ? strategy.replace("refresh-", "") : "memory"
    ) as CacheLocation;

    this.refreshTokenExpirationMs = refreshTokenExpirationMs;

    this.auth0ClientPromise = createAuth0Client({
      domain,
      clientId,
      useRefreshTokens,
      cacheLocation,
      authorizationParams: {
        redirect_uri: window.location.origin,
        // scope: "openid profile email offline_access"
      },
    }).then((Auth0Client) => {
      this.isReady = true;

      return Auth0Client;
    });

    this.appInfo = appInfo;
  }

  private updateUserDetails<D>(
    idToken: IdTokenWithData<D> | null,
  ): UserDetails | null {
    window.clearTimeout(this.userDetailsExpirationTimeoutID);

    const nextUserDetails: UserDetails | null =
      idToken && OthentAuth0Client.isIdTokenValidUser(idToken)
        ? OthentAuth0Client.getUserDetails(idToken)
        : null;

    this.authEventListenerHandler.emit(nextUserDetails);

    if (nextUserDetails) {
      this.userDetailsExpirationTimeoutID = window.setTimeout(
        this.logOut,
        this.refreshTokenExpirationMs,
      );
    }

    // TODO: Persist in localStorage / cookie for cross-tab synching / SSR?

    return (this.userDetails = nextUserDetails);
  }

  // Getters & Setters:

  getAuthEventListenerHandler() {
    return this.authEventListenerHandler;
  }

  setAppInfo(appInfo: AppInfo) {
    this.appInfo = appInfo;
  }

  // Authorization params helper:

  getAuthorizationParams(
    authorizationParams?: AuthorizationParams,
  ): AuthorizationParamsWithTransactionInput;
  getAuthorizationParams(
    data?: CryptoOperationData,
  ): AuthorizationParamsWithTransactionInput;
  getAuthorizationParams(
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

    const transactionInput: TransactionInput = {
      othentFunction: "KMS",
      othentSDKVersion: CLIENT_NAME,
      othentAPIVersion: CLIENT_VERSION,
      appName: this.appInfo.name,
      appVersion: this.appInfo.version,
    };

    if (data) {
      transactionInput.data = data;
    }

    return {
      ...authorizationParams,
      transaction_input: JSON.stringify(transactionInput, replacer),
    } satisfies AuthorizationParamsWithTransactionInput;
  }

  // Wrappers around Auth0's native client with some additional functionality:

  async getTokenSilently(data?: CryptoOperationData) {
    const auth0Client = await this.auth0ClientPromise;

    if (!auth0Client) throw new Error("Missing Auth0 Client");

    const authorizationParams = this.getAuthorizationParams(data);

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

    try {
      const getTokenSilentlyResponse = await auth0Client.getTokenSilently({
        detailedResponse: true,
        authorizationParams,
        cacheMode: "off", // Forces the client to get a new token, as we actually include data in them, it cannot be done any other way.
      });

      // const idToken = jwtDecode<IdTokenWithData>(getTokenSilentlyResponse.id_token);
      // No need for the `jwtDecode()` function/library as Auth0 provides this as `getUser()`:
      const idToken = await auth0Client.getUser<IdTokenWithData>();

      if (!idToken) throw new Error("Could not get the user's details");

      const userDetails = this.updateUserDetails(idToken);

      return {
        ...getTokenSilentlyResponse,
        idToken,
        userDetails,
      };
    } catch (err) {
      this.forceLogOut();

      throw err;
    }
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
      authorizationParams: this.getAuthorizationParams({
        redirect_uri: window.location.origin,
      }),
    });

    return this.getTokenSilently();
  }

  async logOut() {
    const auth0Client = await this.auth0ClientPromise;

    if (!auth0Client) throw new Error("Missing Auth0 Client");

    this.updateUserDetails(null);

    return auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }

  async forceLogOut() {
    this.updateUserDetails(null);

    // We don't want to reload the page in development as we'll lose the logs:
    if (process.env.NODE_ENV !== "production") return;

    return this.logOut().catch((err) => {
      console.warn(err instanceof Error ? err.message : err);
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
