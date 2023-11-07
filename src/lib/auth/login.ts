import { jwtDecode } from 'jwt-decode';
import { LoginReturnProps } from '../../types/auth/login'
import { getAuth0Client, getTokenSilently } from './auth0';
import { DecodedJWT } from '../../types/auth/login';


export async function login(): Promise<LoginReturnProps> {
    const auth0 = await getAuth0Client();
    const isAuthenticated = await auth0.isAuthenticated();

    const baseOptions = {
        authorizationParams: {
            transaction_input: JSON.stringify({
                othentFunction: "KMS",
            }),
            redirect_uri: window.location.origin
        }
    };

    function isDecodedJWT(obj: any): obj is DecodedJWT {
        return obj && typeof obj.contract_id === 'string';
    }

    const loginAndGetDecodedJWT = async (options: any): Promise<{ encoded: string, decoded: DecodedJWT }> => {
        await auth0.loginWithPopup(options);
        const authParams = { transaction_input: JSON.stringify({ othentFunction: "KMS" }) };
        const accessToken = await getTokenSilently(auth0, authParams);
        const jwtObj = jwtDecode(accessToken.id_token) as DecodedJWT;

        if (isDecodedJWT(jwtObj)) {
            return { encoded: accessToken.id_token, decoded: jwtObj };
        } else {
            throw new Error('Invalid JWT structure received.');
        }
    };

    const processDecodedJWT = async (decoded_JWT: DecodedJWT): Promise<LoginReturnProps> => {
        const fieldsToDelete = ['nonce', 'sid', 'aud', 'iss', 'iat', 'exp', 'updated_at'];
        fieldsToDelete.forEach(field => delete decoded_JWT[field as keyof DecodedJWT]);
        return decoded_JWT;
    };

    if (isAuthenticated) {
        const { decoded } = await loginAndGetDecodedJWT(baseOptions);
        return processDecodedJWT(decoded);
    } else {
        try {
            const { decoded } = await loginAndGetDecodedJWT(baseOptions);
            return processDecodedJWT(decoded);
        } catch (error) {
            console.log(error)
            throw new Error('Your browser is blocking us! Please turn off your shields or allow cross site cookies! :)');
        }
    }
}