import { AxiosInstance } from "axios";
import { CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";

// New format:
// export type CreateUserResponseData = boolean;

// Old format:
export interface CreateUserResponseData {
  data: boolean;
}

export async function createUser(
  api: AxiosInstance,
  idToken: string,
): Promise<boolean> {
  let createUserSuccess = false;

  try {
    const createUserResponse = await api.post<CreateUserResponseData>(
      "/create-user",
      { encodedData: idToken } satisfies CommonEncodedRequestData,
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
