import { encodeToken } from "./encodeToken";

export async function getJWT(): Promise<string> {
  return encodeToken();
}
