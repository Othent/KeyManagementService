import { OthentAuth0Client } from "../../auth/auth0";
import { AxiosInstance } from "axios";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { Route } from "../client.constants";
import {
  B64String,
  BinaryDataType,
} from "../../utils/lib/binary-data-types/binary-data-types.types";
import { normalizeBufferDataWithNull } from "../../utils/lib/legacy-serialized-buffers/legacy-serialized-buffer.utils";
import { CommonEncodedRequestData } from "../client.types";

interface EncryptResponseData {
  encryptedData: B64String;
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

  let encryptedData: null | Uint8Array = null;

  try {
    const encryptResponse = await api.post<EncryptResponseData>(Route.ENCRYPT, {
      encodedData,
    } satisfies CommonEncodedRequestData);

    encryptedData = normalizeBufferDataWithNull(
      encryptResponse.data.encryptedData,
    );
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (encryptedData === null) {
    throw new Error("Error encrypting on server.");
  }

  return encryptedData;
}
