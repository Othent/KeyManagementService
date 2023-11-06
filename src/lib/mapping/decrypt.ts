import { decrypt as decryptFunction } from '../operations/decrypt.js'
import { login } from '../auth/login.js'


export async function decrypt(ciphertext: Uint8Array | string | null): Promise<any> {

    const user = await login()

    const decryptedData = await decryptFunction(ciphertext, user.sub)

    return decryptedData

}