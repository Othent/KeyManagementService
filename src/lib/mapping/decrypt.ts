import { decrypt as decryptFunction } from '../operations/decrypt'
import { userDetails } from '../auth/userDetails'


export async function decrypt(ciphertext: any): Promise<any> {

    const user = await userDetails()

    const decryptedData = await decryptFunction(ciphertext, user.sub)

    return decryptedData

}