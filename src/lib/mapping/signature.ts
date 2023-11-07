import { sign as signFunction } from '../operations/sign'
import { userDetails } from '../auth/userDetails'
import { Buffer } from "buffer";
import { Signable } from '../../types/mapping/signable';

/**
 * Generate a signature on behalf of a logged-in user.
 * @param data The data to sign.
 * @returns The {@linkcode Buffer} format of the signature.
 */
export async function signature(data: Signable): Promise<Buffer> {

    const user = await userDetails()

    const response = await signFunction(data, user.sub);

    const rawSignature = Buffer.from(response.data);

    return rawSignature;
}
