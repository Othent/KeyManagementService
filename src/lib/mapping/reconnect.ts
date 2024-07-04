import { UserDetailsReturnProps } from "../../types/auth/userDetails";
import { reconnect as reconnectFunction } from "../auth/reconnect";

/**
 * Connect the users account, this is the same as login/signup in one function.
 * @returns The the users details.
 */
export async function reconnect(): Promise<UserDetailsReturnProps | null> {
  return reconnectFunction();

  /*
  try {
    return await reconnectFunction();
  } catch (err) {
    return null;
  }
  */
}
