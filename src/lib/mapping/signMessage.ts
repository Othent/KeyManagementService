import { signature } from "./signature";

/**
 * Sign the given message. This function assumes (and requires) a user is logged in.
 * @param message The message to sign.
 * @returns The signed version of the message.
 */
export async function signMessage(
  data: any,
  options = { hashAlgorithm: "SHA-256" },
): Promise<number[]> {
  const dataToSign = new Uint8Array(data);

  const hash = await crypto.subtle.digest(options.hashAlgorithm, dataToSign);

  const signedMessage = await signature(hash);

  return Array.from(new Uint8Array(signedMessage));
}
