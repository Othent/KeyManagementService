import { getCachedUserAddress } from "../auth/auth0";

/**
 * Get the active wallet address of the users wallet. This function assumes (and requires) a user is logged in.
 * @returns The active wallet address of the users wallet.
 */
export async function getActiveAddress() {
  return getCachedUserAddress();
}
