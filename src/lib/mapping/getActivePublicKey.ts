import { getPublicKey } from '../operations/getPublicKey';
import { userDetails } from '../auth/userDetails';

export async function getActivePublicKey(): Promise<string> {

    const user = await userDetails()

    const key = await getPublicKey(user.sub)

    return key

}
