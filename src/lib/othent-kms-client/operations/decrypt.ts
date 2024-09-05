import { AxiosInstance } from "axios";
import { OthentAuth0Client } from "../../auth/auth0";
import {
  CommonEncodedRequestData,
  LegacyBufferData,
  normalizeBufferDataWithNull,
} from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { BinaryDataType } from "../../utils/arweaveUtils";

// New format:
// type DecryptResponseData = string;

// Old format:
// TODO: Does the old server actually return plain strings?
interface DecryptResponseData {
  data: string | LegacyBufferData;
}

export async function decrypt(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  ciphertext: string | BinaryDataType,
  keyName: string,
): Promise<Uint8Array> {
  // TODO: `ciphertext` should be encoded with `binaryDataTypeOrStringTob64String()` if we are going to send it inside a JSON:
  const encodedData = await auth0.encodeToken({
    keyName,
    fn: "decrypt",
    ciphertext,
  });

  let plaintext: null | Uint8Array = null;

  try {
    const decryptResponse = await api.post<DecryptResponseData>("/decrypt", {
      encodedData,
    } satisfies CommonEncodedRequestData);

    plaintext = normalizeBufferDataWithNull(decryptResponse.data.data);
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (plaintext === null) {
    throw new Error("Error decrypting on server.");
  }

  return plaintext;
}
