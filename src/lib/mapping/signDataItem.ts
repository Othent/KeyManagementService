import { signature } from "./signature";
import { createData, Signer, DataItemCreateOptions } from "warp-arbundles";
import { getCachedUserPublicKeyBuffer } from "../auth/auth0";

/**
 * The signDataItem() function allows you to create and sign a data item object, compatible with arbundles. These data items can then be submitted to an ANS-104 compatible bundler.
 * @param dataItem The data to sign.
 * @returns The signed data item.
 */
export async function signDataItem(dataItem: SignDataItemParams) {
  const publicKeyBuffer = getCachedUserPublicKeyBuffer();

  if (!publicKeyBuffer) throw new Error("Missing cached user.");

  const { data, ...options } = dataItem;

  async function sign(message: Uint8Array) {
    const signedData = await signature(message);
    return signedData;
  }

  const signer: Signer = {
    publicKey: publicKeyBuffer,
    signatureType: 1,
    signatureLength: 512,
    ownerLength: 512,
    sign,
    // verify: null,
  };

  const dataEntry = createData(data, signer, options);

  try {
    await dataEntry.sign(signer);
  } catch (error) {
    console.log(error);
  }

  return Array.from<number>(dataEntry.getRaw());
}

export interface SignDataItemParams extends DataItemCreateOptions {
  data: string | Uint8Array;
}
