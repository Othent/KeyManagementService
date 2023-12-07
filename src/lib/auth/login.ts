import { jwtDecode } from "jwt-decode";
import { getAuth0Client, getTokenSilently } from "./auth0";
import { DecodedJWT } from "../../types/auth/login";

export async function login(): Promise<any> {
  const auth0 = await getAuth0Client();
  const isAuthenticated = await auth0.isAuthenticated();

  const baseOptions = {
    authorizationParams: {
      transaction_input: JSON.stringify({
        othentFunction: "KMS",
      }),
      redirect_uri: window.location.origin,
    },
  };

  const loginAndGetDecodedJWT = async (
    options: any,
  ): Promise<{ encoded: string; decoded: DecodedJWT }> => {
    await auth0.loginWithPopup(options);
    const authParams = {
      transaction_input: JSON.stringify({ othentFunction: "KMS" }),
    };
    const accessToken = await getTokenSilently(auth0, authParams);
    const jwtObj = jwtDecode(accessToken.id_token) as DecodedJWT;

    localStorage.setItem("id_token", accessToken.id_token);

    return { encoded: accessToken.id_token, decoded: jwtObj };
  };

  const processDecodedJWT = async (decoded_JWT: DecodedJWT): Promise<any> => {
    const fieldsToDelete = [
      "nonce",
      "sid",
      "aud",
      "iss",
      "iat",
      "exp",
      "updated_at",
    ];
    fieldsToDelete.forEach(
      (field) => delete decoded_JWT[field as keyof DecodedJWT],
    );
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
      throw new Error(`${error}`);
    }
  }
}
