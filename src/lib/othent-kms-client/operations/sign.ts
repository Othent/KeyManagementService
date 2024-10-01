import { AxiosInstance } from "axios";
import { OthentAuth0Client } from "../../auth/auth0";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { Route } from "../client.constants";
import {
  B64String,
  BinaryDataType,
} from "../../utils/lib/binary-data-types/binary-data-types.types";
import { normalizeBufferDataWithNull } from "../../utils/lib/legacy-serialized-buffers/legacy-serialized-buffer.utils";
import { CommonEncodedRequestData } from "../client.types";

interface SignResponseData {
  signature: B64String;
}

export async function sign(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  data: string | BinaryDataType,
): Promise<Uint8Array> {
  const encodedData = await auth0.encodeToken({
    path: Route.SIGN,
    data,
  });

  let signature: null | Uint8Array = null;

  try {
    const signResponse = await api.post<SignResponseData>(Route.SIGN, {
      encodedData,
    } satisfies CommonEncodedRequestData);

    signature = normalizeBufferDataWithNull(signResponse.data.signature);
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (signature === null) {
    throw new Error("Error signing data on server.");
  }

  return signature;
}
