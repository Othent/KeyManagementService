import { Buffer } from "buffer";
import { sign as signFunction } from "./sign";
import { signature } from "./signature";
import Transaction from "arweave/web/lib/transaction";
import { createData, Signer } from "warp-arbundles";
import { toBuffer } from "../utils/bufferUtils";
import { userDetails } from "../auth/userDetails";

/**
 * dispatch the given transaction. This function assumes (and requires) a user is logged in and a valid arweave transaction.
 * @param transaction The transaction to sign.
 * @returns The signed version of the transaction.
 */
export async function dispatch(
  transaction: Transaction,
  node?: string,
  arweave?: any,
  analyticsTags?: { name: string; value: string }[]
): Promise<{ id: string }> {
  const user = await userDetails();

  const data = transaction.get("data", { decode: true, string: false });
  // @ts-expect-error
  let tags = (transaction.get("tags") as Tag[]).map((tag) => ({
    name: tag.get("name", { decode: true, string: true }),
    value: tag.get("value", { decode: true, string: true }),
  }));

  if (analyticsTags) {
    tags = [...tags, ...analyticsTags];
  }

  async function sign(message: Uint8Array) {
    const signedData = await signature(message);
    return signedData;
  }

  const signer: Signer = {
    // @ts-ignore
    publicKey: getPublicKey(user.owner),
    signatureType: 1,
    signatureLength: 512,
    ownerLength: 512,
    // @ts-ignore
    sign,
    // @ts-ignore
    verify: null,
  };

  const dataEntry = createData(data, signer, { tags });

  try {
    await dataEntry.sign(signer);
  } catch (error) {
    console.log(error);
  }

  try {
    if (!node) {
      node = "https://turbo.ardrive.io";
    }

    const res = await fetch(`${node}/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: Buffer.from(dataEntry.getRaw()),
    });

    if (res.status >= 400) {
      throw new Error(
        `Error uploading DataItem: ${res.status} ${res.statusText}`,
      );
    }

    return {
      // @ts-ignore
      id: await dataEntry.id,
    };
  } catch {
    await signFunction(transaction);
    const uploader = await arweave.transactions.getUploader(transaction);
    while (!uploader.isComplete) {
      await uploader.uploadChunk();
    }
    return {
      id: transaction.id,
    };
  }
}

function getPublicKey(owner: string) {
  return toBuffer(owner);
}
