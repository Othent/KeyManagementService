import { OthentAuth0Client } from "../../auth/auth0";
import { AxiosInstance } from "axios";
import {
  CommonEncodedRequestData,
  LegacyBufferObject,
  normalizeBufferDataWithNull,
} from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { BinaryDataType } from "../../utils/arweaveUtils";

// Upcoming server response format:
// type EncryptResponseData = B64String;

// Old server response format:
interface EncryptResponseData {
  data: LegacyBufferObject;
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

    console.log(encryptResponse);

    ciphertext = normalizeBufferDataWithNull(encryptResponse.data.data);
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (ciphertext === null) {
    throw new Error("Error encrypting on server.");
  }

  return ciphertext;
}
