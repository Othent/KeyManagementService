import { sign as signFunction } from '../operations/sign'
import { login } from '../auth/login'
import { getPublicKey } from '../operations/getPublicKey'
import { hash } from '../utils/arweaveUtils'
import { Buffer } from "buffer";
import { bufferTob64Url } from '../utils/arweaveUtils'


export async function sign(transaction: any): Promise<any> {

    const user = await login()

    const owner = await getPublicKey(user.sub)

    // @ts-ignore
    transaction.setOwner(owner);

    // @ts-ignore
    const dataToSign = await transaction.getSignatureData()

    let signature = await signFunction(JSON.stringify(dataToSign), user.sub)
    signature = Buffer.from(signature)

    let id = await hash(signature);

    // @ts-ignore
    transaction.setSignature({
        id: bufferTob64Url(id),
        owner: owner,
        signature: bufferTob64Url(signature)
    })
    
    return transaction

}