import { AxiosInstance } from "axios";
import { OthentAuth0Client } from "../../auth/auth0";
import {
  CommonEncodedRequestData,
  LegacyBufferData,
  LegacyBufferObject,
  normalizeBufferDataWithNull,
} from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { BinaryDataType } from "../../utils/arweaveUtils";
import { Route } from "./common.constants";

// Upcoming server response format:
// type DecryptResponseData = B64String;

// Old server response format:
interface DecryptResponseData {
  data: string;
}

export async function decrypt(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  ciphertext: string | BinaryDataType,
): Promise<Uint8Array> {
  const encodedData = await auth0.encodeToken({
    path: Route.DECRYPT,
    ciphertext,
  });

  let plaintext: null | Uint8Array = null;

  try {
    const decryptResponse = await api.post<DecryptResponseData>(Route.DECRYPT, {
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
