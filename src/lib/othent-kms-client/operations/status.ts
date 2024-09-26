import { AxiosInstance } from "axios";
import { CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import { OthentAuth0Client } from "../../auth/auth0";
import { Route } from "./common.constants";

export interface ServerInfoOptions {
  includeToken?: boolean;
}

export interface ServerInfo {
  version: string;
  buildDate: string;
  hasToken: boolean;
  hasTokenData: boolean;
  isTokenValid: boolean;
  isTokenUnused: boolean;
}

export async function serverInfo(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  options?: ServerInfoOptions,
): Promise<ServerInfo> {
  const encodedData = options?.includeToken ? await auth0.encodeToken() : null;

  let serverInfo: ServerInfo | null = null;

  try {
    const serverInfoResponse = encodedData
      ? await api.post<ServerInfo>(Route.HOME, {
          encodedData,
        } satisfies CommonEncodedRequestData)
      : await api.get<ServerInfo>(Route.HOME);

    serverInfo = serverInfoResponse.data;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (!serverInfo) {
    throw new Error("Error requesting the API status.");
  }

  return serverInfo;
}
