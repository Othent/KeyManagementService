import { encrypt as encryptFunction } from '../operations/encrypt'
import { userDetails } from '../auth/userDetails'

export async function encrypt(plaintext: string) {

    const user = await userDetails()

    const encryptedData = await encryptFunction(plaintext, user.sub)

    return encryptedData

}