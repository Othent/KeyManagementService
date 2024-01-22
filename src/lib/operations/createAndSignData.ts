import { api } from "./api";
import { encodeToken } from "../auth/encodeToken";

export async function createAndSignData(
  data: any,
  keyName: string,
  owner: string,
  tags: any,
): Promise<any> {
  const encodedData = await encodeToken({ data, keyName, owner, tags });

  try {
    const createAndSignDataReq = (
      await api.post("/create-bundle-and-sign", { encodedData })
    ).data;

    if (!createAndSignDataReq.dataEntry) {
      throw new Error(
        `Error creating and signing on server. ${createAndSignDataReq}`,
      );
    }

    return createAndSignDataReq.dataEntry;
  } catch (e) {
    throw new Error(`Error creating and signing on server. ${e}`);
  }
}
