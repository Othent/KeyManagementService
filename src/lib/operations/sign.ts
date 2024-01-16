import { api } from "./api";
import { encodeToken } from "../auth/encodeToken";

export async function sign(data: any, keyName: string): Promise<any> {
  const encodedData = await encodeToken({ data, keyName });

  try {
    const signRequest = (await api.post("/sign", { encodedData })).data;
    const signRes = signRequest.data;

    if (!signRes) {
      throw new Error("Error signing data on server.");
    }

    return signRes;
  } catch (e) {
    throw new Error("Error signing data on server.");
  }
}
