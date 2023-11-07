import { userDetails } from '../auth/userDetails'

export async function getWalletNames(): Promise<any> {

    const user = await userDetails()

    return user.email

}

