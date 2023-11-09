import { api } from "./api";
import { encodeToken } from "../auth/encodeToken";

export async function sign(data: any, keyName: string): Promise<any> {
  const encodedData = await encodeToken({ data, keyName });

  try {
    const signRequest = (await api.post("/sign", { encodedData })).data.data;

    if (!signRequest) {
      throw new Error("Error signing data on server.");
    }

    return signRequest;
  } catch (e) {
    throw new Error(`${e}`);
  }
}
