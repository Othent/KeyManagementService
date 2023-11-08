import axios from "axios";
import { encodeToken } from "../auth/encodeToken";

export async function sign(data: any, keyName: string): Promise<any> {
  const encodedData = await encodeToken({ data, keyName });

  const signRequest = (
    await axios({
      method: "POST",
      url: "http://localhost:3001/sign",
      data: { encodedData },
    })
  ).data;

  return signRequest;
}
