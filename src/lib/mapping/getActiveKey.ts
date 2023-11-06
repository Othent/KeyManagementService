import { getActivePublicKey } from "./getActivePublicKey";
import { ownerToAddress } from '../utils/arweaveUtils'

export async function getActiveKey(): Promise<any> {

    const owner = await getActivePublicKey()

    const walletAddress = await ownerToAddress(owner);

    return walletAddress;

}