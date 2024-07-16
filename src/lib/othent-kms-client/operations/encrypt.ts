import { OthentAuth0Client } from "../../auth/auth0";
import { AxiosInstance } from "axios";

export async function encrypt(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  plaintext: string,
  keyName: string,
): Promise<Uint8Array | string | null> {
  const encodedData = await auth0.encodeToken({ plaintext, keyName });

  try {
    const encryptRequest = (await api.post("/encrypt", { encodedData })).data
      .data;

    if (!encryptRequest) {
      throw new Error("Error encrypting on server.");
    }

    return encryptRequest;
  } catch (e) {
    throw new Error("Error encrypting on server.");
  }
}
