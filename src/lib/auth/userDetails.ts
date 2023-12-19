import { jwtDecode } from "jwt-decode";
import { UserDetailsReturnProps } from "../../types/auth/userDetails";
import { DecodedJWT } from "../../types/auth/login";

export async function userDetails(): Promise<UserDetailsReturnProps> {
  const id_token = localStorage.getItem("id_token");

  if (!id_token) {
    throw new Error("Error retrieving session id_token.");
  }

  const decoded_JWT: DecodedJWT = jwtDecode(id_token);
  delete decoded_JWT.nonce;
  delete decoded_JWT.sid;
  delete decoded_JWT.aud;
  delete decoded_JWT.iss;
  delete decoded_JWT.iat;
  delete decoded_JWT.exp;
  delete decoded_JWT.updated_at;
  return decoded_JWT;
}
