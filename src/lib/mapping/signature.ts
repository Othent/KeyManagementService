import { sign as signFunction } from '../operations/sign'
import { login } from '../auth/login'
import { Buffer } from "buffer";

export async function signature(data: Uint8Array|string|null): Promise<any> {

    const user = await login()

    let signature = await signFunction(JSON.stringify(data), user.sub)
    signature = Buffer.from(signature)

    return signature
    
}
