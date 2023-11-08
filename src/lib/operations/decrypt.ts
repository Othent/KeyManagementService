import axios from "axios";
import { encodeToken } from "../auth/encodeToken";

export async function decrypt(
  ciphertext: Uint8Array | string | null,
  keyName: string,
): Promise<string> {
  const encodedData = await encodeToken({ ciphertext, keyName });

  const decryptRequest = (
    await axios({
      method: "POST",
      url: "http://localhost:3001/decrypt",
      data: { encodedData },
    })
  ).data.data;

  return decryptRequest;
}
