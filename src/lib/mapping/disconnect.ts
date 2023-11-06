import { logOut } from '../auth/logOut'

export async function disconnect(): Promise<any> {

    return await logOut()

}