import { AxiosInstance } from "axios";
import { OthentAuth0Client } from "../../auth/auth0";

export async function decrypt(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  ciphertext: string,
  keyName: string,
): Promise<Uint8Array | string | null> {
  const encodedData = await auth0.encodeToken({ ciphertext, keyName });

  try {
    const decryptRequest = (await api.post("/decrypt", { encodedData })).data
      .data;

    if (!decryptRequest) {
      throw new Error("Error decrypting on server.");
    }

    return decryptRequest;
  } catch (e) {
    throw new Error("Error decrypting on server.");
  }
}
