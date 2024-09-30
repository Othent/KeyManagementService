import { Auth0Client, createAuth0Client } from "@auth0/auth0-spa-js";
import {
  CryptoOperationData,
  AuthorizationParams,
  AuthorizationParamsWithTransactionInput,
  IdTokenWithData,
  UserDetails,
  TransactionInput,
  OthentAuth0ClientOptions,
  StoredUserDetails,
  Auth0Sub,
  Auth0Provider,
  OthentWalletAddressLabel,
} from "./auth0.types";
import {
  CLIENT_NAME,
  CLIENT_VERSION,
  DEFAULT_APP_INFO,
  DEFAULT_OTHENT_CONFIG,
} from "../config/config.constants";
import { EventListenersHandler } from "../utils/events/event-listener-handler";
import { AuthListener } from "../othent/othent.types";
import {
  AppInfo,
  Auth0LogInMethod,
  Auth0RedirectUri,
  Auth0RedirectUriWithParams,
  OthentStorageKey,
} from "../config/config.types";
import { getCookieStorage } from "../utils/cookies/cookie-storage";
import { getAnsProfile } from "../utils/ans/ans.utils";
import { PROVIDER_LABELS } from "./auth0.constants";
import { B64UrlString, uint8ArrayTob64Url } from "../utils/arweaveUtils";
import { transactionInputReplacer } from "./auth0.utils";
import { pemToUint8Array } from "../othent-kms-client/operations/import-key";

export class OthentAuth0Client {
  private debug = false;

  private overriddenPublicKey: B64UrlString | null = null;

  private loginMethod: Auth0LogInMethod;

  private redirectURI: Auth0RedirectUri;

  private returnToURI: Auth0RedirectUri;

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

  private appInfo: AppInfo = DEFAULT_APP_INFO;

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

  private async getUserDetails<D>(
    idToken: IdTokenWithData<D>,
  ): Promise<UserDetails> {
    const { email = "", nickname = "", walletAddress } = idToken;
    const sub = (idToken.sub || "") as Auth0Sub;
    const authProvider = sub.split("|")[0] as Auth0Provider;

    let walletAddressLabel: OthentWalletAddressLabel | null =
      await getAnsProfile(walletAddress);

    if (!walletAddressLabel) {
      const providerLabel = PROVIDER_LABELS[authProvider] || "Unknown Provider";

      // We use `nickname` as a fallback here as, for some reason, the Twitter integration doesn't return the email,
      // even thought the `email` option is selected in Auth0's integration:
      walletAddressLabel = `${providerLabel} (${email || (nickname ? `@${nickname}` : "")})`;
    }

    return {
      sub,
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
      email,
      emailVerified: !!idToken.email_verified,
      owner: this.overriddenPublicKey || idToken.owner,
      walletAddress: idToken.walletAddress,
      walletAddressLabel,
      authSystem: idToken.authSystem,
      authProvider,
    } satisfies UserDetails;
  }

  constructor({
    debug,
    domain,
    clientId,
    strategy,
    cache,
    loginMethod,
    redirectURI,
    returnToURI,
    refreshTokenExpirationMs,
    appInfo,
    initialUserDetails,
    cookieKey,
    localStorageKey,
  }: OthentAuth0ClientOptions) {
    this.debug = debug;
    this.loginMethod = loginMethod;
    this.redirectURI = redirectURI;
    this.returnToURI = returnToURI;

    this.auth0ClientPromise = createAuth0Client({
      domain,
      clientId,
      useRefreshTokens: strategy === "refresh-tokens",
      cacheLocation: typeof cache === "string" ? cache : undefined,
      cache: typeof cache === "object" ? cache : undefined,
      authorizationParams: {
        redirect_uri: this.redirectURI,
        // scope: "openid profile email offline_access"
        // audience
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
    // TODO: Add alternative to sync using `BroadcastChannel` without persisting anything.

    if (!this.localStorageKey || typeof window === "undefined") return;

    window.addEventListener("storage", this.handleStorage);
  }

  stopStorageSyncing() {
    if (typeof window === "undefined") return;

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
      const cookieStorage = getCookieStorage();

      if (userDetails) {
        cookieStorage.setItem(cookieKey, JSON.stringify(userDetails), {
          ttlHours: this.refreshTokenExpirationMs / 3600000,
        });
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
    if (typeof window !== "undefined") {
      window.clearTimeout(this.userDetailsExpirationTimeoutID);

      if (userDetails) {
        this.userDetailsExpirationTimeoutID = window.setTimeout(
          this.logOut,
          this.refreshTokenExpirationMs,
        );
      }
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

  async updateUserDetails<D>(
    idToken: null | IdTokenWithData<D>,
  ): Promise<UserDetails | null> {
    const nextUserDetails: UserDetails | null =
      idToken && OthentAuth0Client.isIdTokenValidUser(idToken)
        ? await this.getUserDetails(idToken)
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
      authorizationParamsOrData.hasOwnProperty("path")
        ? {
            authorizationParams: null,
            data: authorizationParamsOrData as CryptoOperationData,
          }
        : {
            authorizationParams:
              authorizationParamsOrData as AuthorizationParams,
            data: null,
          };

    const { appInfo } = this;

    const transactionInput: TransactionInput = {
      othentFunction: "KMS",
      othentSDKVersion: CLIENT_NAME,
      othentAPIVersion: CLIENT_VERSION,
      appName: appInfo.name,
      appVersion: appInfo.version,
      appEnv: appInfo.env,
    };

    if (data) {
      transactionInput.data = data;
    }

    return {
      ...authorizationParams,
      transaction_input: JSON.stringify(
        transactionInput,
        transactionInputReplacer,
      ),
    } satisfies AuthorizationParamsWithTransactionInput;
  }

  // Wrappers around Auth0's native client with some additional functionality:

  async getTokenSilently(data?: CryptoOperationData) {
    const auth0Client = await this.auth0ClientPromise;

    if (!auth0Client) throw new Error("Missing Auth0 Client");

    const authorizationParams = this.getAuthorizationParams(data);

    if (this.debug) {
      try {
        const parsedTransactionInput = JSON.parse(
          authorizationParams.transaction_input,
        );

        if (
          Object.keys(authorizationParams).length === 1 &&
          Object.keys(authorizationParams)[0] === "transaction_input"
        ) {
          console.log(
            "getTokenSilently().transaction_input =",
            parsedTransactionInput,
          );
        } else {
          console.log("getTokenSilently() =", {
            ...authorizationParams,
            transaction_input: parsedTransactionInput,
          });
        }
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

      const userDetails = await this.updateUserDetails(idToken);

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

    if (this.debug) console.log("logIn()");

    const isAuthenticated = await auth0Client.isAuthenticated();

    if (isAuthenticated) {
      throw new Error("Already logged in");
    }

    // This can throw if the popup is close by the user or if we try to open it before the user interacts with the page.
    // In both cases, that's handled in the parent `Othent.connect()`:
    const authorizationParams = this.getAuthorizationParams({
      redirect_uri: this.redirectURI,
      // TODO: This doesn't seem to change anything. It could be used to remember the last provider the user used.
      // connection: "auth0",
    });

    if (this.loginMethod === "popup") {
      // See https://auth0.com/docs/libraries/auth0-single-page-app-sdk#login-with-popup
      await auth0Client.loginWithPopup(
        {
          authorizationParams,
        },
        {
          // { popup: <POPUP> } // This might be useful to provide an already-created popup in platforms like iOS.
        },
      );
    } else {
      // See https://auth0.com/docs/libraries/auth0-single-page-app-sdk#login-with-redirect
      auth0Client.loginWithRedirect({
        authorizationParams,
        // openUrl(url) { }, // This might be useful to control the redirect in mobile platforms.
      });

      throw new Error("Redirecting...");
    }

    return this.getTokenSilently();
  }

  async handleRedirectCallback(
    callbackUrlWithParams: Auth0RedirectUriWithParams,
  ) {
    if (this.debug)
      console.log(`handleRedirectCallback(${callbackUrlWithParams})`);

    const auth0Client = await this.auth0ClientPromise;

    if (!auth0Client) throw new Error("Missing Auth0 Client");

    await auth0Client.handleRedirectCallback(callbackUrlWithParams);

    // await this.getTokenSilently();

    const idToken = (await auth0Client.getUser<IdTokenWithData>()) || null;
    const userDetails = await this.updateUserDetails(idToken);

    return { idToken, userDetails };
  }

  async logOut() {
    this.setUserDetails(null);

    const auth0Client = await this.auth0ClientPromise;

    if (!auth0Client) throw new Error("Missing Auth0 Client");

    return auth0Client
      .logout({
        logoutParams: {
          returnTo: this.returnToURI,
        },
      })
      .catch((err) => {
        console.warn(err instanceof Error ? err.message : err);

        if (typeof location !== "undefined") location.reload();
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

  getCachedUserAddressLabel() {
    return this.userDetails?.walletAddressLabel || null;
  }

  getCachedUserEmail() {
    return this.userDetails?.email || null;
  }

  // DEVELOPMENT:

  async overridePublicKey(publicKeyPEM: string) {
    this.overriddenPublicKey = uint8ArrayTob64Url(
      pemToUint8Array(publicKeyPEM as any),
    );
  }
}
