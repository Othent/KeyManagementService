import { AxiosInstance } from "axios";
import { OthentAuth0Client } from "../../auth/auth0";
import { BufferObject, CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import {
  BinaryDataType,
  binaryDataTypeToString,
  stringToUint8Array,
} from "../../utils/arweaveUtils";

// New format:
// type DecryptResponseData = string;

// Old format:
interface DecryptResponseData {
  data: string | BufferObject;
}

export async function decrypt(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  ciphertext: string | BinaryDataType,
  keyName: string,
): Promise<Uint8Array> {
  // TODO: `ciphertext` should be encoded with `binaryDataTypeOrStringTob64String()` if we are going to send it inside a JSON:
  const encodedData = await auth0.encodeToken({ ciphertext, keyName });

  let plaintext: string | BufferObject | null = null;

  try {
    const decryptResponse = await api.post<DecryptResponseData>("/decrypt", {
      encodedData,
    } satisfies CommonEncodedRequestData);

    plaintext = decryptResponse.data.data ?? null;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (plaintext === null) {
    throw new Error("Error decrypting on server.");
  }

  return typeof plaintext === "string"
    ? stringToUint8Array(plaintext)
    : new Uint8Array(plaintext.data);
}
