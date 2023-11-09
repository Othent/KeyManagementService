import { getActivePublicKey } from "./getActivePublicKey";
import { ownerToAddress } from "../utils/arweaveUtils";

/**
 * Get the active wallet address of the users wallet. This function assumes (and requires) a user is logged in.
 * @returns The active wallet address of the users wallet.
 */
export async function getActiveKey(): Promise<string> {
  const owner = await getActivePublicKey();

  const walletAddress = await ownerToAddress(owner);

  return walletAddress;
}
