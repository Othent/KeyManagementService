import { binaryDataTypeOrStringTob64String } from "../utils/arweaveUtils";
import { CRYPTO_OPERATION_BINARY_DATA_KEYS } from "./auth0.constants";

export function transactionInputReplacer(key: string, value: any) {
  // These are all other properties in TransactionInput, except for `data`:
  if (!CRYPTO_OPERATION_BINARY_DATA_KEYS.includes(key as any)) return value;

  // This is `TransactionInput.data`:
  if (key === "data" && value.hasOwnProperty("path")) return value;

  // This is `TransactionInput.data.data` (from sign operations) or any of the other binary properties fom the other
  // operations:
  return binaryDataTypeOrStringTob64String(value);
}
