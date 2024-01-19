import { createData, Transaction } from "arbundles";
import Arweave from "arweave";
import { getActivePublicKey } from "./getActivePublicKey";
import { sign } from "./sign";

/**
 * dispatch the given transaction. This function assumes (and requires) a user is logged in and a valid arweave transaction.
 * @param transaction The transaction to sign.
 * @returns The signed version of the transaction.
 */
export async function dispatch(
  transaction: Transaction,
  node?: string,
): Promise<{ id: string }> {
  const arweave = new Arweave({});

  const owner = await getActivePublicKey();

  const data = transaction.get("data", { decode: true, string: false });
  // @ts-expect-error
  const tags = (transaction.get("tags") as Tag[]).map((tag) => ({
    name: tag.get("name", { decode: true, string: true }),
    value: tag.get("value", { decode: true, string: true }),
  }));

  try {
    const dataSigner = { sign, publicKey: owner };
    // @ts-ignore (incorrect signer type)
    const dataEntry = createData(data, dataSigner, { tags });
    // @ts-ignore (incorrect signer type)
    await dataEntry.sign(dataSigner);

    if (!node) {
      node = "https://turbo.ardrive.io";
    }

    const res = await fetch(node, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: dataEntry.getRaw(),
    });

    if (res.status >= 400) {
      throw new Error(
        `Error uploading DataItem: ${res.status} ${res.statusText}`,
      );
    }

    return {
      id: dataEntry.id,
    };
  } catch {
    await sign(transaction);
    const uploader = await arweave.transactions.getUploader(transaction);
    while (!uploader.isComplete) {
      await uploader.uploadChunk();
    }
    return {
      id: transaction.id,
    };
  }
}
