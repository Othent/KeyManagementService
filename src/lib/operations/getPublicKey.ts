import axios from 'axios'
import { encodeToken } from '../auth/encodeToken'

export async function getPublicKey(keyName: string): Promise<string> {

    const encodedData = await encodeToken({ keyName })

    const getPublicKeyRequest = (await axios({
        method: 'POST',
        url: 'http://localhost:3001/get-public-key',
        data: { encodedData }
    })).data.data

    return getPublicKeyRequest

}

