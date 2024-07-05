import axios from "axios";

export const api = axios.create({
  baseURL: process.env.kmsServerBaseUrl || "https://kms-server.othent.io",
});
