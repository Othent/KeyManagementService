import { Buffer } from "buffer";
import { sign as signFunction } from "./sign";
import { signature } from "./signature";
import type Transaction from "arweave/web/lib/transaction";
import { createData, Signer } from "warp-arbundles";
import type Arweave from "arweave/web";
import {
  getCachedUserPublicKey,
  getCachedUserPublicKeyBuffer,
} from "../auth/auth0";

/**
 * dispatch the given transaction. This function assumes (and requires) a user is logged in and a valid arweave transaction.
 * @param transaction The transaction to sign.
 * @returns The signed version of the transaction.
 */
export async function dispatch(
  transaction: Transaction,
  arweave: Arweave,
  node?: string,
  analyticsTags?: { name: string; value: string }[],
): Promise<{ id: string }> {
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

  const publicKeyBuffer = getCachedUserPublicKeyBuffer();

  if (!publicKeyBuffer) throw new Error("Missing cached user.");

  const signer: Signer = {
    publicKey: publicKeyBuffer,
    signatureType: 1,
    signatureLength: 512,
    ownerLength: 512,
    sign,
    // verify: null,
  };

  const dataEntry = createData(data, signer, { tags });

  try {
    await dataEntry.sign(signer);
  } catch (error) {
    console.log(error);
  }

  try {
    // TODO: Try with a bunch of different nodes?
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
    // TODO: Why uploader and not just post? When to use one or the other, as they seem
    // to overlap in some cases?
    const uploader = await arweave.transactions.getUploader(transaction);
    while (!uploader.isComplete) {
      await uploader.uploadChunk();
    }
    return {
      id: transaction.id,
    };
  }
}
