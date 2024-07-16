import { AxiosInstance } from "axios";
import { OthentAuth0Client } from "../../auth/auth0";

export async function sign(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  data: string,
  keyName: string,
): Promise<any> {
  const encodedData = await auth0.encodeToken({ data, keyName });

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
