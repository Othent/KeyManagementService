import { jwtDecode } from "jwt-decode";
import { getAuth0Client, getTokenSilently } from "./auth0";
import { DecodedJWT } from "../../types/auth/login";
import { UserDetailsReturnProps } from "../../types/auth/userDetails";

export async function login(): Promise<DecodedJWT | UserDetailsReturnProps | null> {
  console.log("LOGIN");

  // TODO: Prevent multiple calls here?

  const auth0 = await getAuth0Client();
  const isAuthenticated = await auth0.isAuthenticated();

  console.log("login.isAuthenticated =", isAuthenticated);

  // TODO: Throw an error instead as this should never happen.
  if (isAuthenticated) return null;

  // TODO: This seems to be duplicated with what's inside userDetails:

  // TODO: Also review what's the relationship between these and the privatization Rule in Auth0.

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
    const jwtObj = jwtDecode(accessToken.id_token) as DecodedJWT | UserDetailsReturnProps;
    // localStorage.setItem("id_token", accessToken.id_token);

    return jwtObj;
  } catch (error) {
    console.log(error);

    throw new Error(`${error}`);
  }
}
