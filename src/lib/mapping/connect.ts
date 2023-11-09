import { login } from "../auth/login";
import { ConnectReturnType } from "../../types/mapping/connect";
import { createUser } from "../operations/createUser";

/**
 * Connect the users account, this is the same as login/signup in one function.
 * @returns The the users details.
 */
export async function connect(): Promise<ConnectReturnType> {
  const user = await login();

  if (user.authSystem === "KMS") {
    return user;
  } else {
    const userDetails = await createUser();
    return userDetails;
  }
}
