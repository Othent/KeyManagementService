import { getCachedUserSub } from "../auth/auth0";
import { sign as signFunction } from "../operations/sign";
import { Buffer } from "buffer";

/**
 * Generate a signature. This function assumes (and requires) a user is logged in.
 * @param data The data to sign.
 * @returns The {@linkcode Buffer} format of the signature.
 */
export async function signature(
  data: Uint8Array | string | null | ArrayBuffer,
): Promise<Buffer> {
  const sub = getCachedUserSub();

  if (!sub) throw new Error("Missing cached user.");

  // TODO: Does the signFunction actually work with Uint8Array | string | null | ArrayBuffer?
  const response = await signFunction(data, sub);

  const rawSignature = Buffer.from(response.data);

  return rawSignature;
}
