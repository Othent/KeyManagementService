import { CustomAuthParams } from "../../types/auth/auth0";
import { getTokenSilently, getAuth0Client } from "./auth0";

export async function encodeToken<T>(data?: T): Promise<string> {
  const auth0 = await getAuth0Client();
  const authParams: CustomAuthParams = {
    transaction_input: JSON.stringify({ othentFunction: "KMS", data }),
  };
  const accessToken = await getTokenSilently(auth0, authParams);

  return accessToken.id_token;
}
