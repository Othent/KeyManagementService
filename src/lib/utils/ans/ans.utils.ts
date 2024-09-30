import axios from "axios";

import { B64UrlString } from "../arweaveUtils";
import { ANSDomain } from "../../auth/auth0.types";

// Note this type is incomplete. Only the properties we care about in `getAnsProfile` have been typed:
export interface ANSContractState {
  balances?: {
    address: B64UrlString;
    ownedDomains: {
      domain: string;
    }[];
    primary_domain: string;
  }[];
}

/**
 * Get the ANS domain for an address, directly from the ANS contract's state.
 *
 * @param address Address to fetch the domain for.
 *
 * @returns ANS domain, if any.
 */
export async function getAnsProfile(
  address: B64UrlString,
): Promise<ANSDomain | null> {
  try {
    const response = await axios.get<ANSContractState>(
      "https://api.mem.tech/api/state/Tih8T1uESATJNzdwBIY3rpe25kWTzjw8uNiMRYe9I5M",
      {
        // Because this will return the whole contract's state, it could get quite large in the future. Therefore, we set
        // a timeout of 2 seconds to make sure this request doesn't slow down the SDK due to the big download size.
        timeout: 2000,
      },
    );

    const balances = response.data.balances || [];

    const balanceMatch = balances.find(
      (balance) => balance.address === address,
    );

    const domain = balanceMatch
      ? balanceMatch.primary_domain ||
        balanceMatch.ownedDomains[0].domain ||
        null
      : null;

    return domain ? `${domain}.ar` : null;
  } catch (err) {
    console.warn(`Error resolving ANS domain for ${address} =\n`, err);

    return null;
  }
}
