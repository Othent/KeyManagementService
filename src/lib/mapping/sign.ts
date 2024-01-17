import { hash } from "../utils/arweaveUtils";
import { bufferTob64Url } from "../utils/arweaveUtils";
import { signature as getSignedData } from "./signature";
import { getActivePublicKey } from "./getActivePublicKey";
import { Transaction } from "arbundles";

/**
 * Sign the given transaction. This function assumes (and requires) a user is logged in and a valid arweave transaction.
 * @param transaction The transaction to sign.
 * @returns The signed version of the transaction.
 */
export async function sign(transaction: Transaction): Promise<Transaction> {
  const owner = await getActivePublicKey();

  transaction.setOwner(owner);

  const dataToSign = await transaction.getSignatureData();

  const signature = await getSignedData(dataToSign);

  let id = await hash(signature);

  // @ts-ignore
  transaction.setSignature({
    id: bufferTob64Url(id),
    owner: owner,
    signature: bufferTob64Url(signature),
  });

  return transaction;
}
