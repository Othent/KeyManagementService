import { OthentAuth0Client } from "../../auth/auth0";
import { AxiosInstance } from "axios";
import {
  CommonEncodedRequestData,
  LegacyBufferData,
  normalizeBufferDataWithNull,
} from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { BinaryDataType } from "../../utils/arweaveUtils";

// New format:
// type EncryptResponseData = string;

// Old format:
// TODO: Does the old server actually return plain strings?
interface EncryptResponseData {
  data: string | LegacyBufferData;
}

export async function encrypt(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  plaintext: string | BinaryDataType,
  keyName: string,
): Promise<Uint8Array> {
  // TODO: `plaintext` should be encoded with `binaryDataTypeOrStringTob64String()` if we are going to send it inside a JSON:
  const encodedData = await auth0.encodeToken({
    keyName,
    fn: "encrypt",
    plaintext,
  });

  let ciphertext: null | Uint8Array = null;

  try {
    const encryptResponse = await api.post<EncryptResponseData>("/encrypt", {
      encodedData,
    } satisfies CommonEncodedRequestData);

    ciphertext = normalizeBufferDataWithNull(encryptResponse.data.data);
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (ciphertext === null) {
    throw new Error("Error encrypting on server.");
  }

  return ciphertext;
}
