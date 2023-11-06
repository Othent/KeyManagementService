import { jwtDecode } from 'jwt-decode';
import { UserDetailsReturnProps } from '../../types/auth/userDetails';
import { getTokenSilently, getAuth0Client } from './auth0'
import { DecodedJWT } from '../../types/auth/login'



export async function userDetails(): Promise<UserDetailsReturnProps> {
    const auth0 = await getAuth0Client();
    const authParams = { transaction_input: JSON.stringify({ othentFunction: "idToken" }) }
    const accessToken = await getTokenSilently(auth0, authParams)
    const JWT = accessToken.id_token
    const decoded_JWT: DecodedJWT = jwtDecode(JWT)
    delete decoded_JWT.nonce
    delete decoded_JWT.sid
    delete decoded_JWT.aud
    delete decoded_JWT.iss
    delete decoded_JWT.iat
    delete decoded_JWT.exp
    delete decoded_JWT.updated_at
    return decoded_JWT;
}