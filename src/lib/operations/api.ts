import axios from "axios";

export const api = axios.create({
  baseURL: "https://kms-server.othent.io",
});
