import { AxiosInstance } from "axios";
import { CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { OthentAuth0Client } from "../../auth/auth0";
import { Route } from "./common.constants";
import { UserDetails } from "../../auth/auth0.types";

export interface CreateUserOptions {
  importOnly?: boolean;
}

interface CreateUserResponseData {
  userDetails: UserDetails | null;
}

export async function createUser(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  options: CreateUserOptions,
): Promise<UserDetails> {
  const encodedData = await auth0.encodeToken({
    path: Route.CREATE_USER,
    ...options,
  });

  let userDetails: UserDetails | null = null;

  try {
    const createUserResponse = await api.post<CreateUserResponseData>(
      Route.CREATE_USER,
      { encodedData } satisfies CommonEncodedRequestData,
    );

    userDetails = createUserResponse.data.userDetails;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (!userDetails) {
    throw new Error("Error creating user on server.");
  }

  return userDetails;
}
