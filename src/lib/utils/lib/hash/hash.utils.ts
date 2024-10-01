import { BinaryDataType } from "../binary-data-types/binary-data-types.types";

export async function hash(
  data: BinaryDataType,
  algorithm: string = "SHA-256",
): Promise<Uint8Array> {
  let digest = await crypto.subtle.digest(algorithm, data);
  return new Uint8Array(digest);
}
