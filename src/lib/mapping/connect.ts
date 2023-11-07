import { login } from '../auth/login'
import { ConnectReturnType } from '../../types/mapping/connect'
import { createUser } from '../operations/createUser'



export async function connect(): Promise<ConnectReturnType> {

    const user = await login()

    if (user) {

        return user

    } else {

        // @ts-ignore
        const userDetails = await createUser(user)

        // @ts-ignore
        return userDetails

    }
    
}