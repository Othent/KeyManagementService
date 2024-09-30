import { AxiosInstance } from "axios";
import { CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { OthentAuth0Client } from "../../auth/auth0";
import { Route } from "./common.constants";
import { IdTokenWithData } from "../../auth/auth0.types";

export interface CreateUserOptions {
  importOnly?: boolean;
}

interface CreateUserResponseData {
  idTokenWithData: IdTokenWithData<null> | null;
}

export async function createUser(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  options: CreateUserOptions,
): Promise<IdTokenWithData<null> | null> {
  const encodedData = await auth0.encodeToken({
    path: Route.CREATE_USER,
    ...options,
  });

  let idTokenWithData: IdTokenWithData<null> | null = null;

  try {
    const createUserResponse = await api.post<CreateUserResponseData>(
      Route.CREATE_USER,
      { encodedData } satisfies CommonEncodedRequestData,
    );

    idTokenWithData = createUserResponse.data.idTokenWithData;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (!idTokenWithData) {
    throw new Error("Error creating user on server.");
  }

  return idTokenWithData;
}
