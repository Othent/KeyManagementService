import { AxiosInstance } from "axios";
import { CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { OthentAuth0Client } from "../../auth/auth0";

// New format:
// export type CreateUserResponseData = boolean;

// Old format:
export interface CreateUserResponseData {
  data: boolean;
}

export async function createUser(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  idToken?: string,
  importOnly?: boolean,
): Promise<boolean> {
  const encodedData =
    idToken ||
    (await auth0.encodeToken({
      keyName: "",
      importOnly,
    }));

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
