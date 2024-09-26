import axios, { AxiosInstance } from "axios";
import { createUser, CreateUserOptions } from "./operations/createUser";
import { decrypt } from "./operations/decrypt";
import { encrypt } from "./operations/encrypt";
import { sign } from "./operations/sign";
import { serverInfo, ServerInfoOptions } from "./operations/server-info";
import { OthentAuth0Client } from "../auth/auth0";
import { BinaryDataType } from "../utils/arweaveUtils";

export class OthentKMSClient {
  api: AxiosInstance;

  auth0: OthentAuth0Client;

  constructor(baseURL: string, auth0: OthentAuth0Client) {
    this.api = axios.create({ baseURL });
    this.auth0 = auth0;
  }

  async serverInfo(options?: ServerInfoOptions) {
    return serverInfo(this.api, this.auth0, options);
  }

  async createUser(options: CreateUserOptions) {
    return createUser(this.api, this.auth0, options);
  }

  async decrypt(ciphertext: string | BinaryDataType) {
    return decrypt(this.api, this.auth0, ciphertext);
  }

  async encrypt(plaintext: string | BinaryDataType) {
    return encrypt(this.api, this.auth0, plaintext);
  }

  async sign(data: string | BinaryDataType) {
    return sign(this.api, this.auth0, data);
  }

  getSignerSignFn() {
    return async (data: Uint8Array) => {
      const signatureBuffer = await this.sign(data);

      return signatureBuffer;
    };
  }
}
