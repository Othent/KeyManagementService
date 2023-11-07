import { encrypt as encryptFunction } from '../operations/encrypt'
import { userDetails } from '../auth/userDetails'


/**
 * Encrypt data with the users JWK. This function assumes (and requires) a user is logged in and a valid string to sign.
 * @param plaintext The data in string format to sign.
 * @returns The encrypted data.
 */
export async function encrypt(plaintext: string) : Promise<any> {

    const user = await userDetails()

    const encryptedData = await encryptFunction(plaintext, user.sub)

    return encryptedData

}