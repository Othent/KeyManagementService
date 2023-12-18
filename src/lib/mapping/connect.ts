import { login } from "../auth/login";
import { ConnectReturnType } from "../../types/mapping/connect";
import { createUser } from "../operations/createUser";
import { getJWT } from "../auth/getJWT";
import { userDetails } from "../auth/userDetails";

/**
 * Connect the users account, this is the same as login/signup in one function.
 * @returns The the users details.
 */
export async function connect(): Promise<ConnectReturnType> {
  const user = await login();

  if (user.authSystem === "KMS" && user.owner && user.walletAddress) {
    return user;
  } else {
    await createUser();
    const userDetailsJWT = await getJWT();
    localStorage.setItem("id_token", JSON.stringify(userDetailsJWT));
    return await userDetails();
  }
}
