import axios from "axios";

export const api = axios.create({
  // baseURL: "https://kms-server.othent.io",
  baseURL: "http://localhost:3001",
});
