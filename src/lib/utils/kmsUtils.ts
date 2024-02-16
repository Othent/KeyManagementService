// import { generateMnemonic, getKeyFromMnemonic  } from 'arweave-mnemonic-keys'
import { ownerToAddress } from "./arweaveUtils";
import JWktoPem from "jwk-to-pem";
import forge from "node-forge";
import crypto from "crypto";

interface JWKInterface {
  kty: string;
  e: string;
  n: string;
  d?: string | undefined;
  p?: string | undefined;
  q?: string | undefined;
  dp?: string | undefined;
  dq?: string | undefined;
  qi?: string | undefined;
}

export async function generateKey(): Promise<{
  mnemonic: string;
  JWK: JWKInterface;
  walletAddress: string;
}> {
  // const mnemonic = await generateMnemonic() // while testing
  // const JWK = await getKeyFromMnemonic(mnemonic) // while testing

  const mnemonic =
    "crash buffalo kit mule arena try soup custom round enter enforce nasty";

  const JWK = {
    kty: "RSA",
    e: "AQAB",
    n: "jAmti34mF2QsgoGt6dkt0ZW3IC-CgHVNaSXbMLCeUYrVgnJ2Qw90kkD1kigHLCMLa82od387mm7oEbEf7eA1tOronVPN1cexulH2BUFr1dBRuLo8flYap9qu-kxarNKdzqimqaPhh0FUUhIcwacQgpLxLBNKYQUr_800DnFebsz_veQmKcdxOBWIE8iTknCJll-LYqu88opwDOjFkhNex98gLtKtwGCLrPlr_Fn54hTmKs1RJ8GIg100HPkQLS3RUZIoMu18yRdtohb0rcSt5cJSoa7TU2KvPU7ur6J93amxaNUGNEDUhU4r0-WlULTph73QhccLA7GeAaBfDIi2m2riNQap4BdN89m43l1-hEIn1jyvS9NRGZVIrL0uOOU91CHf4JZ5t7r5_atvxh2yTSXdWepZ4KO8bzanYX2b8xSQK_c5vKfA9tpWTVulXSOqHaBpPKgHsZhTv0Sz3KvKWWcyUHve_t115HWNM2fpMWcqsA_ySK5pasQUYCL8i3fg-ia_IWdV57L0uvebtoBjOUu8-DsbBaIEHsKPre8tjOy2ZnXt9hcKJ9jweM1AxkRB6LqnzgVpoW-4ktDGcmTDDZsXgAyj-eBP2DPgG2v923iRuY0-Y5FSyUcOc-KoRTjWSnWn9bsZnbIVXBuPHj3lfqbmYE1zeT_M7GgRtknSvNU",
    d: "Io_07Du7TQSlU6SL9u5qN5Ma-m-fZvMMown72j2NJZT9c0-qzoxO-hXcRjFo68TOedHtZWjanhgHYO51cfFnb_qWZNYdNEkwHUtDTDLEWaYrtUsJySiZNZpsm0wjCQqGdk37rFzNOeOu2v6raERCd-eqbHVqYx2yqVTNJ09lvjUMXaKkpKUb1XrC9hcIDRmHa7yzGyxF2xq94wHEWXQ8bVotiEDpL1TkxFFfDI5sdRcxY5j_Ea_bcIidZxU1n-DyC47mKwOgS8VjgqDlzMmBHfbjDBKpB6iQlbIYiPKy2_WY2sXQ3S6vBSOw_4BrV8r-5Ei94XapykSZOc-KBf7sCnwtZyhUgZPBmDZhFCg4W50FpXZ3-GryUSZR9xfwKL8wmneY_lR2b7PzYNoqzS0zMN0PxdrJ2nRKWGjFGBhePMCpUzWBj0-Gm3vw_4p5XNRfvkbkLlL6hJZqCuV4c-7QHuJIXF0xSHtloq9Rs3ITIVdnj3ZlGWXXF-wvkS3oGPMGsaACrD0srhYcfu1GIAH5_H-ie8uaGB0xV9ZTeN4iRiBXVXcMdjgqWwecCEk2c3N9fhipZROdhD2WL-0Ve9NYLDMPs9LefWU_GPjwpjuVhs9eC1hZqXZaa1adXZoFmlcA0OAunNb3w6Efnf-IMtoIPqAaaSKP1nPJniOL0kZe2jU",
    p: "yJ0D1ZauCeFLu8pWV-lbQPHta5FnbvjMHd4RPzFJHLw1RiAWCDNLa-FAJnDr09kfZWL12HOUbh5ylnli9j01RM3PFW3LlwYxjWzkViciOghfvUGVo-TlGA9JAC_wLQtQ7ZGGOp-Czs1car5t4NZLJTsQwWggSn8Xj5HZKxlj9kTjEUaFOU2baWhPxH8bATGaPw9kdfTCHNe2wjoSvDSRBkoc_wen_bL-5GUii3Nj9rETMKtJ_vgrB_5MkK4aIisILVISUfDT7ix9CtMFCtWnFJgwM8r5NzW9Ia40WuMox_POcW4_cKVhym-Eora_Ey1uNTSDgedx53AUCBEzpfNBow",
    q: "srNLZ78TuVVcKgDJfjD2dqRbj11wXcftm9URf72mX2Dpamvcw-qHjoeQNt0WpvfNgSkS2m5TdLTQXzPJ_fSq7oJ4wX9jzxjENyx-KKFcbB2PoY-dqPGhrK785h5C49Df865kFWGk6Vo8Br_6J9WUWE0M8L2ZNJG-4wqFnZMeuGyFIghw4T3aIZeblgt6btAm2asR3JM0arQjIL4z_4hvUN4NwmUjNskD-_NGGAoNxcGOTLqBgi8uiJvxJRaCoaZyXJGlFS1b-6h4_lMSOqt7hKzoQc4reLVvBBzObNxrG1qMlljwLSorpwXQZSM6FK-6l_KjYCVoKglHxyWAJvsfJw",
    dp: "BuMtIIYdz4UGnpnhwP7n_SDRL-I8FNlB2LypBuxgQDZN9exgFUP9kOSY2TkDP7CynT56hkXhkK5G7NeaCC4tyADw3SF53eN-jAZzCGoriKaE8vBvfML9AohzzyfWLRW4X4-hdh3H1eXDCH8lMpTo24xdlOZIRYZ7fphZRluGzQusaAltxXvenA3Sv0JF4RKc4xFaN5qBl4_oXF62CfQcDoU43aCbqeAdVCYMu5Dom62UpRUcYz6N66ZVZpozl3y2uSeaLWoBPKoWWOrJv4d6RwC6luyfBcA4kBF1BrHJ0qOSMN7CGtHyu4p8mUGA6d2jbPwyj6Esje-RIH3GsinZ1Q",
    dq: "AfdJABYxEFvpDKk_jjzZqUp7m2Mqxk1ZxtocPCyI9Qmq57nSDvG4lg_VvVTHWATn5ODfzTljf6gxlqqKMVoMu10CGRbesTuThQvfQ3ErBCF7IArlcCNgZPbz31A76ie1HwgvH7EYUFzmxig8h02pOSN33fooAlUMJZFLEQW6U8sV198B5uh4SuBRHOB5c1ik5MYmBygzbm0W6dhN2CTXHKukuRvFvGePvKjbf440wpUzjJKMtDLyrxwQFhleTIr5PR15FHeQSH98_UdKrwyN6lLAp2CuR8CvPPtYJghywTVI0Kqf0c9h9Y9x0HsHu4yHX_6SX49pyvSZLo6yDzu6Bw",
    qi: "DXqJxy0a7Yriv8JxytDLToL_4_Q-XE035dbHFPrcbpT9PNXP0uvJ7NM66GfigBuHIcobfZfyIXmmRlVDtKZ-DD0lsOSLjNOItZsqsA7jyRyUK9ZXucWO_TflQuOvi17LOgRHAyKuBPNGjZ4fHvnwkt6O7cvCtMtfSGnpeQ1Lmh2Np_ZjXln8E3s2iH-0aL4y_HsBFs91frOzTgp9Y7yxko0EXnxtWC_31VuuqdlcMRIOXKAf9C8_Bg1xcQS-uxT2pnI-wClR27lMnC-sLLIW1Th6I1FxMFx526TF2Urd_RayRawyydswk_gj3k9CUgrDuN0jrTenGAZ67wqIQ660OA",
  };

  const walletAddress = await ownerToAddress(JWK.n);

  return { mnemonic, JWK, walletAddress };
}

export function formatKey(JWK: any) {
  const pemKey = JWktoPem(JWK, { private: true });

  const privateKey = forge.pki.privateKeyFromPem(pemKey);
  const der = forge.asn1
    .toDer(forge.pki.privateKeyToAsn1(privateKey))
    .getBytes();

  const derBuffer = Buffer.from(der, "binary");

  return derBuffer;
}

export function encryptKey(jobPem: any, targetKey: any) {
  return crypto.publicEncrypt(
    {
      key: jobPem,
      oaepHash: "sha256",
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    targetKey,
  );
}
