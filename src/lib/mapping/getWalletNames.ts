import { getCachedUserEmail } from "../auth/auth0";

/**
 * Get the wallets (users) email. This function assumes (and requires) a user is logged in.
 * @returns The wallets (users) email.
 */
export async function getWalletNames() {
  return getCachedUserEmail();
}
