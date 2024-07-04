import { getCachedUserDetails } from "../auth/auth0";

/**
 * Get user details. This function assumes (and requires) a user is logged in.
 * @returns The user's details.
 */
export function getUserDetails() {
  return getCachedUserDetails();
}
