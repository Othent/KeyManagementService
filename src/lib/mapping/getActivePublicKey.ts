import { getCachedUserPublicKey } from "../auth/auth0";

/**
 * Get the owner (jwk.n) field of the users wallet. This function assumes (and requires) a user is logged in.
 * @returns The owner (jwk.n) field of the users wallet.
 */
export async function getActivePublicKey() {
  return getCachedUserPublicKey();
}
