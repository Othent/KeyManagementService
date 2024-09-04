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
// type SignResponseData = string;

// Old format:
// TODO: Does the old server actually return plain strings?
interface SignResponseData {
  data: string | LegacyBufferData;
}

export async function sign(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  data: string | BinaryDataType,
  keyName: string,
): Promise<Uint8Array> {
  // TODO: `data` should be encoded with `binaryDataTypeOrStringTob64String()` if we are going to send it inside a JSON:
  const encodedData = await auth0.encodeToken({ keyName, fn: "sign", data });

  let signature: null | Uint8Array = null;

  try {
    const signResponse = await api.post<SignResponseData>("/sign", {
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
