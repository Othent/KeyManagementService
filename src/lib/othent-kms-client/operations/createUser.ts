import { AxiosInstance } from "axios";
import { CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { OthentAuth0Client } from "../../auth/auth0";
import { Route } from "./common.constants";

export interface CreateUserOptions {
  importOnly?: boolean;
}

// New format:
// TODO: Return the created user...
// export type CreateUserResponseData = boolean;

// Old format:
interface CreateUserResponseData {
  data: boolean;
}

export async function createUser(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  options: CreateUserOptions,
): Promise<boolean> {
  const encodedData = await auth0.encodeToken({
    path: Route.CREATE_USER,
    ...options,
  });

  let createUserSuccess = false;

  try {
    const createUserResponse = await api.post<CreateUserResponseData>(
      Route.CREATE_USER,
      { encodedData } satisfies CommonEncodedRequestData,
    );

    createUserSuccess = createUserResponse.data.data;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (!createUserSuccess) {
    throw new Error("Error creating user on server.");
  }

  return true;
}
