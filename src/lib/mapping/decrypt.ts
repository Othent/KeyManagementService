import { decrypt as decryptFunction } from "../operations/decrypt";
import { userDetails } from "../auth/userDetails";

/**
 * Decrypt data with the users JWK. This function assumes (and requires) a user is logged in and a valid encrypt() response.
 * @param ciphertext The data to decrypt.
 * @returns The decrypted data.
 */
export async function decrypt(ciphertext: any): Promise<any> {
  const user = await userDetails();

  const decryptedData = await decryptFunction(ciphertext, user.sub);

  return decryptedData;
}
