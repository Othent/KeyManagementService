import { AxiosInstance } from "axios";
import { OthentAuth0Client } from "../../auth/auth0";
import {
  CommonEncodedRequestData,
  LegacyBufferObject,
  normalizeBufferDataWithNull,
} from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { BinaryDataType } from "../../utils/arweaveUtils";
import { Route } from "./common.constants";

// Upcoming server response format:
// type SignResponseData = B64String;

// Old server response format:
interface SignResponseData {
  data: LegacyBufferObject;
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

    signature = normalizeBufferDataWithNull(signResponse.data.data);
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (signature === null) {
    throw new Error("Error signing data on server.");
  }

  return signature;
}
