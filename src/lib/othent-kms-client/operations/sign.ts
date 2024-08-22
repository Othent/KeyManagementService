import { AxiosInstance } from "axios";
import { OthentAuth0Client } from "../../auth/auth0";
import { BufferObject, CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { BinaryDataType, stringToUint8Array } from "../../utils/arweaveUtils";

// New format:
// type SignResponseData = string;

// Old format:
interface SignResponseData {
  data: string | BufferObject;
}

export async function sign(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  data: string | BinaryDataType,
  keyName: string,
): Promise<Uint8Array> {
  // TODO: `data` should be encoded with `binaryDataTypeOrStringTob64String()` if we are going to send it inside a JSON:
  const encodedData = await auth0.encodeToken({ data, keyName });

  let signature: string | BufferObject | null = null;

  try {
    const signResponse = await api.post<SignResponseData>("/sign", {
      encodedData,
    } satisfies CommonEncodedRequestData);

    signature = signResponse.data.data;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (signature === null) {
    throw new Error("Error signing data on server.");
  }

  return typeof signature === "string"
    ? stringToUint8Array(signature)
    : new Uint8Array(signature.data);
}
