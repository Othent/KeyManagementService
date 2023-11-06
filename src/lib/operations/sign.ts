import axios from "axios"

export async function sign(data: any, keyName: string): Promise<any> {

    const signRequest = (await axios({
        method: 'POST',
        url: 'http://localhost:3001/sign',
        data: { data, keyName }
    })).data.data

    return signRequest

}
