import { getTokenSilently, getAuth0Client } from "./auth0";

export async function encodeToken(data: object): Promise<string> {
  const auth0 = await getAuth0Client();
  const authParams = {
    transaction_input: JSON.stringify({ othentFunction: "KMS", data }),
  };
  const accessToken = await getTokenSilently(auth0, authParams);
  const JWT = accessToken.id_token;
  return JWT;
}
