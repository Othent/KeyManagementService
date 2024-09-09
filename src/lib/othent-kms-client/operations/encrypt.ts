import { OthentAuth0Client } from "../../auth/auth0";
import { AxiosInstance } from "axios";
import {
  CommonEncodedRequestData,
  normalizeBufferDataWithNull,
} from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { B64String, BinaryDataType } from "../../utils/arweaveUtils";
import { Route } from "./common.constants";

interface EncryptResponseData {
  data: B64String;
  // TODO: New shape: encryptedData: B64String;
}

export async function encrypt(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  plaintext: string | BinaryDataType,
): Promise<Uint8Array> {
  const encodedData = await auth0.encodeToken({
    path: Route.ENCRYPT,
    plaintext,
  });

  let ciphertext: null | Uint8Array = null;

  try {
    const encryptResponse = await api.post<EncryptResponseData>(Route.ENCRYPT, {
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
