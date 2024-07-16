import { AxiosInstance } from "axios";
import { CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";

// TODO: Update to keep old response format:
export type CreateUserResponseData = boolean;

export async function createUser(
  api: AxiosInstance,
  idToken: string,
) {
  let createUserSuccess = false;

  try {
    const createUserResponse = await api.post<CreateUserResponseData>(
      "/create-user",
      { encodedData: idToken } satisfies CommonEncodedRequestData,
    );

    createUserSuccess = createUserResponse.data;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (!createUserSuccess) {
    throw new Error("Error creating user on server.");
  }

  return true;
}
