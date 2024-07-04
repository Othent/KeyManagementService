import { getCachedUserSub } from "../auth/auth0";
import { encrypt as encryptFunction } from "../operations/encrypt";

/**
 * Encrypt data with the users JWK. This function assumes (and requires) a user is logged in and a valid string to sign.
 * @param plaintext The data in string format to sign.
 * @returns The encrypted data.
 */
export async function encrypt(
  plaintext: Uint8Array | string,
): Promise<Uint8Array | string | null> {
  const sub = getCachedUserSub();

  if (!sub) throw new Error("Missing cached user.");

  const encryptedData = await encryptFunction(plaintext, sub);

  return encryptedData;
}
