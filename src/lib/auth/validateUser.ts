import { DecodedJWT } from "../../types/auth/login";
import { UserDetailsReturnProps } from "../../types/auth/userDetails";

export function isUserValid(user: DecodedJWT | UserDetailsReturnProps): user is UserDetailsReturnProps {
  return !!(
    user &&
    'authSystem' in user && 
    user.authSystem === "KMS" &&
    user.owner &&
    user.walletAddress
  );
}
