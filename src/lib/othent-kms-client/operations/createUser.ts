import { AxiosInstance } from "axios";
import { OthentAuth0Client } from "../../auth/auth0";

export async function createUser(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
): Promise<any> {
  const encodedData = await auth0.encodeToken();

  try {
    const createUserRequest = (await api.post("/create-user", { encodedData }))
      .data;

    if (!createUserRequest) {
      throw new Error("Error creating user on server.");
    }

    return createUserRequest;
  } catch (e) {
    console.log(e);

    throw new Error("Error creating user on server.");
  }
}
