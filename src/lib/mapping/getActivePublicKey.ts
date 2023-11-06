import { getPublicKey } from '../operations/getPublicKey';
import { login } from '../auth/login';

export async function getActivePublicKey(): Promise<string> {

    const user = await login()

    const key = await getPublicKey(user.sub)

    return key

}
