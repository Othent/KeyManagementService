import axios, { AxiosInstance } from "axios";
import { createUser } from "./operations/createUser";
import { decrypt } from "./operations/decrypt";
import { encrypt } from "./operations/encrypt";
import { sign } from "./operations/sign";
import { OthentAuth0Client } from "../auth/auth0";
import {
  BinaryDataType,
  binaryDataTypeOrStringTob64String,
  stringToUint8Array,
} from "../utils/arweaveUtils";

export class OthentKMSClient {
  api: AxiosInstance;

  auth0: OthentAuth0Client;

  constructor(baseURL: string, auth0: OthentAuth0Client) {
    this.api = axios.create({ baseURL });
    this.auth0 = auth0;
  }

  async createUser(idToken: string) {
    return createUser(this.api, idToken);
  }

  async decrypt(ciphertext: string | BinaryDataType, keyName: string) {
    return decrypt(
      this.api,
      this.auth0,
      binaryDataTypeOrStringTob64String(ciphertext),
      keyName,
    );
  }

  async encrypt(plaintext: string | BinaryDataType, keyName: string) {
    return encrypt(
      this.api,
      this.auth0,
      binaryDataTypeOrStringTob64String(plaintext),
      keyName,
    );
  }

  async sign(data: string | BinaryDataType, keyName: string) {
    console.log("sign()");

    return sign(
      this.api,
      this.auth0,
      binaryDataTypeOrStringTob64String(data),
      keyName,
    );
  }

  getSignerSignFn(keyName: string) {
    return async (data: Uint8Array) => {
      // TODO: Note the backend returns b64strings so we might need to convert and properly type this:
      const signature = await this.sign(data, keyName);

      return stringToUint8Array(signature);
    };
  }
}
