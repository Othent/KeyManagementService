import { signature } from "./signature";

/**
 * Sign the given message. This function assumes (and requires) a user is logged in.
 * @param message The message to sign.
 * @returns The signed version of the message.
 */
export async function signMessage(
  data: Uint8Array,
  options = { hashAlgorithm: "SHA-256" },
): Promise<number[]> {
  // TODO: Make data: Uint8Array | string | null | ArrayBuffer?
  // TODO: Use TextEncoder here rather than making users use it manually?

  const dataToSign = new Uint8Array(data);

  const hash = new Uint8Array(
    await crypto.subtle.digest(options.hashAlgorithm, dataToSign),
  );

  const signedMessage = await signature(hash);

  // TODO: Why did we chose to return an array instead of the Buffer?
  return Array.from(new Uint8Array(signedMessage));
}
