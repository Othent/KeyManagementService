import { AxiosInstance } from "axios";
import { OthentAuth0Client } from "../../auth/auth0";
import { CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { B64UrlString } from "../../utils/arweaveUtils";

// TODO: Update to keep old response format:
export type SignResponseData = string;

export async function sign(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  data: B64UrlString,
  keyName: string,
) {
  const encodedData = await auth0.encodeToken({ data, keyName });

  let signature: string | null = null;

  try {
    const signResponse = await api.post<SignResponseData>("/sign", {
      encodedData,
    } satisfies CommonEncodedRequestData);

    signature = signResponse.data;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (signature === null) {
    throw new Error("Error signing data on server.");
  }

  return signature;
}
