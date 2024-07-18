import { OthentAuth0Client } from "../../auth/auth0";
import { AxiosInstance } from "axios";
import { CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { B64UrlString } from "../../utils/arweaveUtils";

// TODO: Update to keep old response format:
export type EncryptResponseData = string;

export async function encrypt(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  plaintext: B64UrlString,
  keyName: string,
) {
  const encodedData = await auth0.encodeToken({ plaintext, keyName });

  let ciphertext: string | null = null;

  try {
    const encryptResponse = await api.post<EncryptResponseData>("/encrypt", {
      encodedData,
    } satisfies CommonEncodedRequestData);

    ciphertext = encryptResponse.data ?? null;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (ciphertext === null) {
    throw new Error("Error encrypting on server.");
  }

  return ciphertext;
}
