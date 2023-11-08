import axios from "axios";
import { encodeToken } from "../auth/encodeToken";

export async function encrypt(
  plaintext: Uint8Array | string | null,
  keyName: string,
): Promise<Uint8Array | string | null> {
  const encodedData = await encodeToken({ plaintext, keyName });

  const encryptRequest = (
    await axios({
      method: "POST",
      url: "http://localhost:3001/encrypt",
      data: { encodedData },
    })
  ).data.data;

  return encryptRequest;
}
