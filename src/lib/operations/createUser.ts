import axios from "axios"

export async function createUser(accessToken: string): Promise<string> {

    // to do

    const createUserRequest = (await axios({
        method: 'POST',
        url: 'http://localhost:3001/create-user',
        data: { accessToken }
    })).data.data

    return createUserRequest

}
