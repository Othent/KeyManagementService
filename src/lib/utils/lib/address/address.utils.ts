import { B64UrlString } from "../binary-data-types/binary-data-types.types";
import { B64Url, UI8A } from "../binary-data-types/binary-data-types.utils";
import { hash } from "../hash/hash.utils";

export async function ownerToAddress(
  owner: B64UrlString,
): Promise<B64UrlString> {
  return B64Url.from(await hash(UI8A.from(owner, "B64UrlString")));
}
