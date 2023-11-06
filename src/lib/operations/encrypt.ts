import axios from "axios"

export async function encrypt(plaintext: Uint8Array | string | null, keyName: string): Promise<Uint8Array | string | null> {

    const encryptRequest =  (await axios({
        method: 'POST',
        url: 'http://localhost:3001/encrypt',
        data: { plaintext, keyName }
    })).data.data

    return encryptRequest

}

