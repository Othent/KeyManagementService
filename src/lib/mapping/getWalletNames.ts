import { getCachedUserEmail } from "../auth/auth0";

/**
 * Get the wallets (users) email. This function assumes (and requires) a user is logged in.
 * @returns The wallets (users) email.
 */
export async function getWalletNames() {
  // TODO: This is misleading because the keys and addresses are derived from decoded_JWT.sub, which is NOT the user's email. Otherwise, developers and users
  // could expect that if they sign up with a GMail account and then with a Twitter account that uses the same email, they get access to the same wallet, and
  // that's NOT the case.

  return getCachedUserEmail();
}
