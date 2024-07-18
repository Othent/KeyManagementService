import { AxiosInstance } from "axios";
import { OthentAuth0Client } from "../../auth/auth0";
import { CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { B64UrlString } from "../../utils/arweaveUtils";

// TODO: Update to keep old response format:
export type DecryptResponseData = string;

export async function decrypt(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  ciphertext: B64UrlString,
  keyName: string,
) {
  const encodedData = await auth0.encodeToken({ ciphertext, keyName });

  let plaintext: string | null = null;

  try {
    const decryptResponse = await api.post<DecryptResponseData>("/decrypt", {
      encodedData,
    } satisfies CommonEncodedRequestData);

    plaintext = decryptResponse.data ?? null;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (plaintext === null) {
    throw new Error("Error decrypting on server.");
  }

  return plaintext;
}
