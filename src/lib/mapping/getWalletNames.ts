import { userDetails } from "../auth/userDetails";

/**
 * Get the wallets (users) email. This function assumes (and requires) a user is logged in.
 * @returns The wallets (users) email.
 */
export async function getWalletNames(): Promise<string> {
  const user = await userDetails();

  return user.email;
}
