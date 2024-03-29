import { sign as signFunction } from "../operations/sign";
import { userDetails } from "../auth/userDetails";
import { Buffer } from "buffer";

/**
 * Generate a signature. This function assumes (and requires) a user is logged in.
 * @param data The data to sign.
 * @returns The {@linkcode Buffer} format of the signature.
 */
export async function signature(
  data: Uint8Array | string | null | ArrayBuffer,
): Promise<Buffer> {
  const user = await userDetails();

  const response = await signFunction(data, user.sub);

  const rawSignature = Buffer.from(response.data);

  return rawSignature;
}
