import { login } from '../auth/login'

export async function getWalletNames(): Promise<any> {

    const user = await login()

    return user.email

}

