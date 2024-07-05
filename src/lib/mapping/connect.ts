import { login } from "../auth/login";
import { createUser } from "../operations/createUser";
import { UserDetailsReturnProps } from "../../types/auth/userDetails";
import { getCachedUserDetails } from "../auth/auth0";
import { isUserValid } from "../auth/validateUser";
import { reconnect } from "../auth/reconnect";

/**
 * Connect the users account, this is the same as login/signup in one function.
 * @returns The the users details.
 */
export async function connect(): Promise<UserDetailsReturnProps> {
  console.log("CONNECT");

  const user = await reconnect();

  if (user) return user;

  const newUser = await login();

  if (newUser && isUserValid(newUser)) {
    console.log("User already existed in KMS.");

    return newUser;
  }

  console.log("Creating new KMS user.");

  await createUser();

  // localStorage.setItem("id_token", JSON.stringify(userDetailsJWT));
  return getCachedUserDetails()!;
}
