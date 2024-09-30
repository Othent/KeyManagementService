import { AxiosInstance } from "axios";
import { OthentAuth0Client } from "../../auth/auth0";
import {
  CommonEncodedRequestData,
  normalizeBufferDataWithNull,
} from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { B64String, BinaryDataType } from "../../utils/arweaveUtils";
import { Route } from "./common.constants";

interface DecryptResponseData {
  decryptedData: B64String;
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

  let decryptedData: null | Uint8Array = null;

  try {
    const decryptResponse = await api.post<DecryptResponseData>(Route.DECRYPT, {
      encodedData,
    } satisfies CommonEncodedRequestData);

    decryptedData = normalizeBufferDataWithNull(
      decryptResponse.data.decryptedData,
    );
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (decryptedData === null) {
    throw new Error("Error decrypting on server.");
  }

  return decryptedData;
}
