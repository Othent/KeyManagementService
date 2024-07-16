import type Transaction from "arweave/web/lib/transaction";
import { Tag as TagData } from "warp-arbundles";

// TODO: Add Othent's analytics tags:

const ANALYTICS_TAGS: TagData[] = [
  {
    name: "Client",
    value: "Othent KMS",
  },
  {
    name: "Client-Version",
    value: "", // TODO: Get this from package.json
  },
];

export function addOthentAnalyticsTags(transaction: Transaction) {
  if (ANALYTICS_TAGS.length === 0) return;

  for (const { name, value } of ANALYTICS_TAGS) {
    transaction.addTag(name, value);
  }
}
