import { api } from "./api";
import { encodeToken } from "../auth/encodeToken";

export async function getPublicKey(keyName: string): Promise<string> {
  const encodedData = await encodeToken({ keyName });

  try {
    const getPublicKeyRequest = (
      await api.post("/get-public-key", { encodedData })
    ).data.data;

    if (!getPublicKeyRequest) {
      throw new Error("Error retrieving public key on server.");
    }

    return getPublicKeyRequest;
  } catch (e) {
    throw new Error("Error retrieving public key on server.");
  }
}
