import { getActivePublicKey } from "./getActivePublicKey";
import { sign } from "./sign";
import { createAndSignData } from "../operations/createAndSignData";
import { userDetails } from "../auth/userDetails";

/**
 * dispatch the given transaction. This function assumes (and requires) a user is logged in and a valid arweave transaction.
 * @param transaction The transaction to sign.
 * @returns The signed version of the transaction.
 */
export async function dispatch(
  transaction: any,
  node?: string,
  Arweave?: any,
): Promise<{ id: string }> {
  const owner = await getActivePublicKey();

  const data = transaction.get("data", { decode: true, string: false });
  // @ts-expect-error
  const tags = (transaction.get("tags") as Tag[]).map((tag) => ({
    name: tag.get("name", { decode: true, string: true }),
    value: tag.get("value", { decode: true, string: true }),
  }));

  try {
    const user = await userDetails();

    const dataEntry = await createAndSignData(data, user.sub, owner, tags);

    if (!node) {
      node = "https://turbo.ardrive.io";
    }

    const res = await fetch(node, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: dataEntry.raw,
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
    const arweave = Arweave.init({
      host: "arweave.net",
      protocol: "https",
      port: 443,
    });
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
