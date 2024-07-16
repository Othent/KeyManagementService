import type Transaction from "arweave/web/lib/transaction";
import { ANALYTICS_TAGS } from "../config/config.constants";

export function addOthentAnalyticsTags(transaction: Transaction) {
  if (ANALYTICS_TAGS.length === 0) return;

  for (const { name, value } of ANALYTICS_TAGS) {
    transaction.addTag(name, value);
  }
}
