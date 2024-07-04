import { hash } from "../utils/arweaveUtils";
import { bufferTob64Url } from "../utils/arweaveUtils";
import { signature as getSignedData } from "./signature";
import type Transaction from "arweave/web/lib/transaction";
import { getCachedUserPublicKey } from "../auth/auth0";

// TODO: Rename to signTransaction

/**
 * Sign the given transaction. This function assumes (and requires) a user is logged in and a valid arweave transaction.
 * @param transaction The transaction to sign.
 * @returns The signed version of the transaction.
 */
export async function sign(
  transaction: Transaction,
  analyticsTags?: { name: string; value: string }[],
): Promise<Transaction> {
  const publicKey = getCachedUserPublicKey();

  if (!publicKey) throw new Error("Missing cached user.");

  transaction.setOwner(publicKey);

  if (analyticsTags) {
    for (const tag of analyticsTags) {
      transaction.addTag(tag.name, tag.value);
    }
  }

  const dataToSign = await transaction.getSignatureData();

  const signature = await getSignedData(dataToSign);

  let id = await hash(signature);

  transaction.setSignature({
    id: bufferTob64Url(id),
    owner: publicKey,
    signature: bufferTob64Url(signature),
  });

  return transaction;
}
