import axios from "axios"

export async function decrypt(ciphertext: Uint8Array | string | null, keyName: string): Promise<string> {

    const decryptRequest = (await axios({
        method: 'POST',
        url: 'http://localhost:3001/decrypt',
        data: { ciphertext, keyName }
    })).data.data

    return decryptRequest

}
