import { encrypt as encryptFunction } from '../operations/encrypt.js'
import { login } from '../auth/login.js'

export async function encrypt(plaintext: Buffer) {

    const user = await login()

    const encryptedData = await encryptFunction(plaintext, user.sub)

    return encryptedData

}