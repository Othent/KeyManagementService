import { jwtDecode } from "jwt-decode";
import { getAuth0Client, getTokenSilently } from "./auth0";
import { DecodedJWT } from "../../types/auth/login";

export async function login(): Promise<any> {
  console.log("LOGIN");

  const auth0 = await getAuth0Client();
  const isAuthenticated = await auth0.isAuthenticated();

  console.log("login.isAuthenticated =", isAuthenticated);

  if (isAuthenticated) return null;

  // TODO: This seems to be duplicated with what's inside userDetails:
  /*
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
  */

  try {
    console.log("loginWithPopup");

    // TODO: Missing try-catch if the modal is closed.
    await auth0.loginWithPopup({
      authorizationParams: {
        transaction_input: JSON.stringify({
          othentFunction: "KMS",
        }),
        redirect_uri: window.location.origin,
      },
    });

    const accessToken = await getTokenSilently(auth0);
    const jwtObj = jwtDecode(accessToken.id_token) as DecodedJWT;
    // localStorage.setItem("id_token", accessToken.id_token);

    return jwtObj;
  } catch (error) {
    console.log(error);

    throw new Error(`${error}`);
  }
}
