import { getAuth0Client, getTokenSilently } from "./auth0";

export async function getJWT(): Promise<string> {
  const auth0 = await getAuth0Client();
  const authParams = {
    transaction_input: JSON.stringify({ othentFunction: "KMS" }),
  };
  const accessToken = await getTokenSilently(auth0, authParams);
  const JWT = accessToken.id_token;
  return JWT;
}
