import { getAuth0Client } from "./auth0.js";
import { LogOutReturnProps } from "../../types/auth/logOut.js";

export async function logOut(): Promise<LogOutReturnProps> {
    const auth0 = await getAuth0Client();
    await auth0.logout({
        logoutParams: {
            returnTo: window.location.origin
        }
    });
    return { response: 'User logged out' }
}
