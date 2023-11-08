import { logOut } from "../auth/logOut";

/**
 * Disconnect the users wallet. This will require the user to log back in after called.
 * @returns Nothing.
 */
export async function disconnect(): Promise<any> {
  await logOut();
}
