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
  OthentAuth0ClientOptions,
  StoredUserDetails,
} from "./auth0.types";
import {
  CLIENT_NAME,
  CLIENT_VERSION,
  DEFAULT_OTHENT_CONFIG,
} from "../config/config.constants";
import { EventListenersHandler } from "../utils/events/event-listener-handler";
import { AuthListener } from "../othent/othent.types";
import { AppInfo, OthentStorageKey } from "../config/config.types";
import { cookieStorage } from "../utils/cookies/cookie-storage";

export class OthentAuth0Client {
  private auth0ClientPromise: Promise<Auth0Client | null> =
    Promise.resolve(null);

  private authEventListenerHandler = new EventListenersHandler<AuthListener>({
    diffParams: true,
    replyOnListen: true,
  });

  private userDetails: UserDetails | null = null;

  private userDetailsExpirationTimeoutID = 0;

  private cookieKey: OthentStorageKey | null = null;

  private localStorageKey: OthentStorageKey | null = null;

  private refreshTokenExpirationMs =
    +DEFAULT_OTHENT_CONFIG.auth0RefreshTokenExpirationMs;

  private appInfo: AppInfo = {
    name: "",
    version: "",
  };

  isReady = false;

  isAuthenticated = false;

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
      // TODO: Add the walletName here and resolve https://ans.gg
      authSystem: idToken.authSystem,
    };
  }

  constructor({
    domain,
    clientId,
    strategy,
    cookieKey,
    localStorageKey,
    refreshTokenExpirationMs,
    appInfo,
    initialUserDetails,
  }: OthentAuth0ClientOptions) {
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
    }).then((Auth0Client) => {
      this.isReady = true;

      return Auth0Client;
    });

    this.cookieKey = cookieKey;

    this.localStorageKey = localStorageKey;

    this.refreshTokenExpirationMs = refreshTokenExpirationMs;

    this.appInfo = appInfo;

    this.restoreUserDetails(initialUserDetails || null);

    this.handleStorage = this.handleStorage.bind(this);
  }

  // Getters / Setters:

  getAuthEventListenerHandler() {
    return this.authEventListenerHandler;
  }

  setAppInfo(appInfo: AppInfo) {
    this.appInfo = appInfo;
  }

  // Storage listeners:

  initStorageSyncing() {
    if (this.localStorageKey) {
      window.addEventListener("storage", this.handleStorage);
    } else {
      console.warn(
        "Calling `Othent.init` is a NOOP unless the `localStorageKey` option is used.",
      );
    }
  }

  stopStorageSyncing() {
    window.removeEventListener("storage", this.handleStorage);
  }

  private handleStorage(event: StorageEvent) {
    if (event.key !== this.localStorageKey) return;

    if (event.newValue) {
      this.restoreUserDetails();
    } else {
      this.logOut();
    }
  }

  private persistUserDetails(userDetails: UserDetails | null) {
    const { cookieKey, localStorageKey } = this;

    if (cookieKey) {
      if (userDetails) {
        cookieStorage.setItem(cookieKey, JSON.stringify(userDetails));
      } else if (cookieStorage.getItem(cookieKey) !== null) {
        cookieStorage.removeItem(cookieKey);
      }
    }

    if (localStorageKey) {
      if (userDetails) {
        const now = new Date();

        const serializedUserDetails = JSON.stringify({
          userDetails,
          createdAt: now.toUTCString(),
          expiredBy: new Date(
            now.getTime() + this.refreshTokenExpirationMs,
          ).toUTCString(),
        } satisfies StoredUserDetails);

        localStorage.setItem(localStorageKey, serializedUserDetails);
      } else {
        this.clearStoredUserDetails();
      }
    }
  }

  // `userDetails` setters:

  private setUserDetails(userDetails: UserDetails | null, updateAuth = true) {
    window.clearTimeout(this.userDetailsExpirationTimeoutID);

    if (userDetails) {
      this.userDetailsExpirationTimeoutID = window.setTimeout(
        this.logOut,
        this.refreshTokenExpirationMs,
      );
    }

    const updatedAlreadyEmitted = this.authEventListenerHandler.emit(
      userDetails,
      updateAuth ? !!userDetails : this.isAuthenticated,
    );

    if (!updatedAlreadyEmitted) {
      // Only update this object (its ref) if something has actually changed, just in case some code in user land
      // is actually relaying on this ref only changing if the data changes too:
      this.userDetails = userDetails;
    }

    if (updateAuth) {
      // We don't update `isAuthenticated`, `localStorage` or `cookieStorage` if `setUserDetails` was called from `restoreUserDetails`:
      this.isAuthenticated = !!userDetails;
      this.persistUserDetails(userDetails);
    }

    return userDetails;
  }

  private restoreUserDetails(userDetails?: UserDetails | null) {
    let initialUserDetails = userDetails || null;

    if (!initialUserDetails && this.localStorageKey) {
      try {
        const storedUserDetails = JSON.parse(
          localStorage.getItem(this.localStorageKey) || "null",
        ) as StoredUserDetails | null;

        if (storedUserDetails) {
          const expiredBy = new Date(storedUserDetails.expiredBy).getTime();

          if (!isNaN(expiredBy) && expiredBy > Date.now()) {
            initialUserDetails = storedUserDetails.userDetails;
          } else {
            this.clearStoredUserDetails();
          }
        }
      } catch (err) {
        /* NOOP */
      }
    }

    this.setUserDetails(initialUserDetails, false);
  }

  private clearStoredUserDetails() {
    // We remove anything that starts with "othent" rather than just `localStorageKey` in case there are leftover
    // entries from previous runs:
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("othent")) localStorage.removeItem(key);
    });
  }

  private updateUserDetails<D>(
    idToken: IdTokenWithData<D>,
  ): UserDetails | null {
    const nextUserDetails: UserDetails | null =
      idToken && OthentAuth0Client.isIdTokenValidUser(idToken)
        ? OthentAuth0Client.getUserDetails(idToken)
        : null;

    return this.setUserDetails(nextUserDetails);
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
      // This is probably not needed / too drastic. Let the application handle the error:
      //
      // if (
      //   err instanceof Error &&
      //   err.message !== "Login required" &&
      //   !err.message.startsWith("Missing Refresh Token")
      // ) {
      //   this.logOut();
      // }

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
    this.setUserDetails(null);

    const auth0Client = await this.auth0ClientPromise;

    if (!auth0Client) throw new Error("Missing Auth0 Client");

    return auth0Client
      .logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      })
      .catch((err) => {
        console.warn(err instanceof Error ? err.message : err);

        window.location.reload();
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
