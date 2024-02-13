import { api } from "./api";
import { encodeToken } from "../auth/encodeToken";
import { generateKey, formatKey, encryptKey } from "../utils/kmsUtils";

export async function createUserWithKey(): Promise<any> {
  // TODO remove walletAddress later
  const { mnemonic, JWK, walletAddress } = await generateKey();

  const formattedKey = formatKey(JWK);

  const pem = "we need to ask the server here for import job key";

  const encryptedKey = encryptKey(pem, formattedKey);

  const encodedData = await encodeToken({ encryptedKey });

  try {
    const createUserRequest = (
      await api.post("/create-user-with-key", { encodedData })
    ).data.data;

    if (!createUserRequest) {
      throw new Error("Error creating user with key on server.");
    }

    return mnemonic;
  } catch (e) {
    throw new Error("Error creating user with key on server.");
  }
}
