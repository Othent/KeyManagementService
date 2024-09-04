import { AxiosInstance } from "axios";
import { CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { OthentAuth0Client } from "../../auth/auth0";

export interface CreateUserOptions {
  importOnly?: boolean;
}

// New format:
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
    fn: "createUser",
    ...options,
  });

  let createUserSuccess = false;

  try {
    const createUserResponse = await api.post<CreateUserResponseData>(
      "/create-user",
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
