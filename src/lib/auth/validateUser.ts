import { UserDetailsReturnProps } from "../../types/auth/userDetails";

export function isUserValid(user: UserDetailsReturnProps) {
  return !!(
    user &&
    user.authSystem === "KMS" &&
    user.owner &&
    user.walletAddress
  );
}
