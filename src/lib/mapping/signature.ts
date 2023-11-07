import { sign as signFunction } from '../operations/sign'
import { login } from '../auth/login'
import { Buffer } from "buffer";
import { Signable } from '../../types/mapping/signable';
import { LoginReturnProps } from '../../types/auth/login';

/**
 * Generate a signature on behalf of a logged-in user.
 * @param data The data to sign.
 * @param loggedInUser (Optional) The user signing the data. If not provided, we use the currently logged in user.
 * @returns The {@linkcode Buffer} format of the signature.
 */
export async function signature(
    data: Signable,
    loggedInUser?: LoginReturnProps
): Promise<Buffer> {

    const user = loggedInUser || await login()

    const response = await signFunction(data, user.sub);

    const rawSignature = Buffer.from(response.data);

    return rawSignature;
}
