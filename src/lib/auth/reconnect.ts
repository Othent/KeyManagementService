import { DecodedJWT } from "../../types/auth/login";
import {
  getAuth0Client,
  getCachedUserDetails,
  getTokenSilently,
} from "./auth0";

export async function reconnect(): Promise<DecodedJWT | null> {
  console.log("RECONNECT");

  const auth0 = await getAuth0Client();
  const isAuthenticated = await auth0.isAuthenticated();

  console.log("reconnect.isAuthenticated =", isAuthenticated);

  // if (!isAuthenticated) return null;

  try {
    await getTokenSilently(auth0);
  } catch (err) {
    console.log("RECONNECT ERROR", err);
  }

  return getCachedUserDetails();
}
