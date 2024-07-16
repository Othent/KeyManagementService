import axios, { AxiosInstance } from "axios";
import { createUser } from "./operations/createUser";
import { decrypt } from "./operations/decrypt";
import { encrypt } from "./operations/encrypt";
import { sign } from "./operations/sign";
import { OthentAuth0Client } from "../auth/auth0";
import { BinaryDataType, bufferToString, stringToBuffer } from "../utils/arweaveUtils";

export class OthentKMSClient {
  api: AxiosInstance;

  auth0: OthentAuth0Client;

  static serializeBufferSource(source: string | BinaryDataType) {
    return typeof source === "string" ? source : bufferToString(source);
  }

  constructor(baseURL: string, auth0: OthentAuth0Client) {
    this.api = axios.create({ baseURL });
    this.auth0 = auth0;
  }

  async createUser(idToken: string) {
    return createUser(this.api, idToken);
  }

  async decrypt(ciphertext: Uint8Array | string, keyName: string) {
    return decrypt(
      this.api,
      this.auth0,
      OthentKMSClient.serializeBufferSource(ciphertext),
      keyName,
    );
  }

  async encrypt(plaintext: Uint8Array | string, keyName: string) {
    return encrypt(
      this.api,
      this.auth0,
      OthentKMSClient.serializeBufferSource(plaintext),
      keyName,
    );
  }

  async sign(data: Uint8Array | string, keyName: string) {
    return sign(
      this.api,
      this.auth0,
      OthentKMSClient.serializeBufferSource(data),
      keyName,
    );
  }

  getSignerSignFn(keyName: string) {
    return async (data: Uint8Array) => {
      const signature = await this.sign(data, keyName);

      return stringToBuffer(signature);
    };
  }
}
