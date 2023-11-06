import axios from 'axios'

export async function getPublicKey(keyName: string): Promise<string> {

    const getPublicKeyRequest = (await axios({
        method: 'POST',
        url: 'http://localhost:3001/get-public-key',
        data: { keyName }
    })).data.data

    return getPublicKeyRequest

}

