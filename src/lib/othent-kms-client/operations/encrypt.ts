import { OthentAuth0Client } from "../../auth/auth0";
import { AxiosInstance } from "axios";
import { BufferObject, CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { BinaryDataType, stringToUint8Array } from "../../utils/arweaveUtils";

// New format:
// type EncryptResponseData = string;

// Old format:
interface EncryptResponseData {
  data: string | BufferObject;
}

export async function encrypt(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  plaintext: string | BinaryDataType,
): Promise<Uint8Array> {
  // TODO: `plaintext` should be encoded with `binaryDataTypeOrStringTob64String()` if we are going to send it inside a JSON:
  const encodedData = await auth0.encodeToken({ fn: "encrypt", plaintext });

  let ciphertext: string | BufferObject | null = null;

  try {
    const encryptResponse = await api.post<EncryptResponseData>("/encrypt", {
      encodedData,
    } satisfies CommonEncodedRequestData);

    ciphertext = encryptResponse.data.data ?? null;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (ciphertext === null) {
    throw new Error("Error encrypting on server.");
  }

  return typeof ciphertext === "string"
    ? stringToUint8Array(ciphertext)
    : new Uint8Array(ciphertext.data);
}
