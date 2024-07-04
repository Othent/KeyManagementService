import { getCachedUserSub } from "../auth/auth0";
import { decrypt as decryptFunction } from "../operations/decrypt";

/**
 * Decrypt data with the users JWK. This function assumes (and requires) a user is logged in and a valid encrypt() response.
 * @param ciphertext The data to decrypt.
 * @returns The decrypted data.
 */
export async function decrypt(
  ciphertext: Uint8Array | string,
): Promise<Uint8Array | string | null> {
  const sub = getCachedUserSub();

  if (!sub) throw new Error("Missing cached user.");

  const decryptedData = await decryptFunction(ciphertext, sub);

  return decryptedData;
}
