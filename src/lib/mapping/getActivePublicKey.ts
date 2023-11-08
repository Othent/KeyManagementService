import { getPublicKey } from "../operations/getPublicKey";
import { userDetails } from "../auth/userDetails";

/**
 * Get the owner (jwk.n) field of the users wallet. This function assumes (and requires) a user is logged in.
 * @returns The owner (jwk.n) field of the users wallet.
 */
export async function getActivePublicKey(): Promise<string> {
  const user = await userDetails();

  const key = await getPublicKey(user.sub);

  return key;
}
