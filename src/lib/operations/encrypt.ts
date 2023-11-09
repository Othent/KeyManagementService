import { api } from "./api";
import { encodeToken } from "../auth/encodeToken";

export async function encrypt(
  plaintext: Uint8Array | string | null,
  keyName: string,
): Promise<Uint8Array | string | null> {
  const encodedData = await encodeToken({ plaintext, keyName });

  try {
    const encryptRequest = (await api.post("/encrypt", { encodedData })).data
      .data;

    if (!encryptRequest) {
      throw new Error("Error encrypting on server.");
    }

    return encryptRequest;
  } catch (e) {
    throw new Error(`${e}`);
  }
}
