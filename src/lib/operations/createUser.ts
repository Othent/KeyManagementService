import { api } from "./api";
import { encodeToken } from "../auth/encodeToken";

export async function createUser(): Promise<any> {
  const encodedData = await encodeToken({ data: null });

  try {
    const createUserRequest = (await api.post("/create-user", { encodedData }))
      .data.data;

    if (!createUserRequest) {
      throw new Error("Error creating user on server.");
    }

    return createUserRequest;
  } catch (e) {
    throw new Error("Error creating user on server.");
  }
}
