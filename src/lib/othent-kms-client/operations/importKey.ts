// TODO: Not implemented.

/*

export interface GenerateKeyReturnType {
  mnemonic: string;
  JWK: any;
}

export interface ImportKeyReturnType {
  importedKey: any;
  mnemonic: string;
}

export interface ImportCryptoKeyReturnType {}
*/

// import { kmsClient } from "./kmsClient.js";
// import jwkToPem from "jwk-to-pem";
// import { generateKey } from "../arweave/generateKey.js";
// import { ownerToAddress } from "../arweave/arweaveUtils.js";

// async function prepareKeyForImport(JWK) {
//
//   const stringJWK = JSON.stringify(JWK)
//   const bufferStuff = Buffer.from(stringJWK, 'utf-8')
//
//   const encryptedKey = crypto.publicEncrypt({
//     key: heloop,
//     padding: constants.RSA_PKCS1_OAEP_PADDING,
//     oaepHash: 'sha256',
//   }, bufferStuff);
//
//   return bufferStuff;
// }

// export default async function importKey(): Promise<any> {
//   await createImportJob("Job3");
//
//   const { mnemonic, JWK } = await generateKey();
//
//   delete JWK.d;
//   delete JWK.p;
//   delete JWK.q;
//   delete JWK.dp;
//   delete JWK.dq;
//   delete JWK.qi;
//
//   const processedKey = await prepareKeyForImport(JWK)
//
//   const res = await importTheKey('Job3', 'Key', processedKey)
//
//   const walletAddress = await ownerToAddress(JWK.n);
//
//   return { mnemonic, walletAddress };
// }

import { generateMnemonic, getKeyFromMnemonic } from "arweave-mnemonic-keys";

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
}> {
  const mnemonic = (await generateMnemonic()) as string; // while testing
  const JWK = (await getKeyFromMnemonic(mnemonic)) as JWKInterface; // while testing

  // let key = getKeyFromMnemonic('jewel cave spy act loyal solid night manual joy select mystery unhappy')
  // arweave.wallets.jwkToAddress(key);

  /*
  const mnemonic = "crash buffalo kit mule arena try soup custom round enter enforce nasty";

  const JWK = {
    kty: "RSA",
    n: "hzVT40eFDUz5c6olsFU-LU1eDbgGQ0huJMExmXNVGcqyikVrLgV9Pir29ajXq92G7dX1-ZHDfmPuQlWE0C1inZh_0wawdmHmM0RFCazFBz14iF3pRSIOM0hNjzaJ1pJQz62qnvK11wMrUTDI__JgRnIQEMb05DdpOprgKi9BKKoG6d2wJXxMjUWO5nCtBuifq3jGxuyxV8hFmikAepsqcziTQcFNdeZXlNF4CivQKml0ALhOUPkAAFOAhD4hqUyuT1yvm10ZQm4O7rkNump_GcNgqJIDLgKC0UAqfwcSGDCHNlCMrpG7Nuq7x8zjTMzn7Ox8a5DrQMGpUqvXuMHnzo9bSM_Tl27GutetNigsWoioBU_vQSWnPOkCPGkAImKqupzFDe1tgVMwcgqZ4g0raWsHZxdIKCMZOjAxnhH2EYEu5hLZk8wENdDkKWEoOgdK-m288nHcWamy9_NbWPyv7RZ3L89egIJ3CTIM5HpfljiaESQmISG59AtBttUjJH5W3LkQcoJTctxulZBSUmZEmJdBZqlZm3TOkxrjI9uFtsLKSqKGcsEido0pjO9kd-MfwSotFjaL-Uo641W9l7k1mI9s7pHQZ79aSzTxFDT7OMzR-oeUIua4q8UlWWwEvrStQahM7WirzPi8kVT2wdg0Pgc6vemU50z1w_Y-gAJRHOM",
    e: "AQAB",
    d: "WOgSD0M6FDLnXM0nFzoWNofHLtIxHBEGjBiVWsfhz6HfoNhgz9RANJ7f4U1y88opLT8iDUdx-ywOwYOmX5VYYTSj6MlfQ5jAXDmqA-CddlNPbKwD9bedCs-iYGeGX5e6l7UkmnwSYh3tX-fqY5KnB-t88OtCoMZm5Whtuo90Ex8qiKGDcEK5u7Nfcdvpir9wLrquSqPdQVGpouMPM4_QbA9plTVckAg00uCiRF3m9dx9sPOAW_I_s_c0bMDGNaL8g6b4ufqP34SrQQJiKpBYn0I_ztikSp7QEnRU_U5S8aEHaAmzWB7vsf7MF2d8l0Wtw7cFYV3bs6skgf4JTa4DlHMuH3WQ_JKO82zg3As_68T9MT8rBWFBZF97iDuSeOUMjxll-x461bNDgd2WVS0YrxcDPp1ah-3PYQ7M4j0sjJDfVjBvimECAD97ScxdI_LM0L88lKc79a6gQCWFoLbiNpfFIChynU-4z-cuJ3XMJKXH3Sq_OWqlvmNaYUubgie8ZtvA4rSiwgsAzW8CAEYkaaOZOMTqF32U7AIzblbkh80WfPofkqrEQId9e_gP2sa3P59abbRZaINDq6WLus8XEILk526yjb-joAzLRTAD8xMYHcuw0Z-YN-uVu08dPeRs7VwAJ3I7chpLOIaFUwtdNBvl7_eF8lwvM62lcyPRfyE",
    p: "06LM6_RJBI4zfNTprJ6StCn1Oj-N-s7xTw5YUasafOw6eb6CwepQp7IFJFa5pQcN1AiKueHeoIumQBimrPnJvEC3fgyQaKZaRDtyOEpOnLdGjigHBPesw4Zv9QoCaL9xqO782Sj9ar3sZciPccqDzEbe5iBDUD751JHhZc_nbFob5v1BZlr3oaiBQtJvvNcp79h4ncUDNtPLCd5zTueBYcSMRopGkl0Q1bjAGgGfUm85ek8o9Xcxkf4rs4-cenOdu8I1qLC2bSkfZlGX_ieO04CovEtnbaVO4tGMbTcNV4dchf432aoNfBUzrTFObTHsaeBarSIZMk3-Qd56A4nJ-w",
    q: "o40gWU0uVsM3PgUYt2kZDhkDc_v5AJRfsudDXsfDT62tGERPVgLXDQebz6C6ZGBnPCnNC_LO3D8xmQWhO6uoS0Hy2ExlgpZwex0SBxJcSUUcy1EUanpPqldz5GIBfrbi2iNRYTFhAQqhWrU7yWO9SMkuTlhX641jBXWTytoEoMsun7mMA3-7DkY8swOjW-ZbwE6uuwWp71Mtub5pCR0nJddoRBPDeTAwH3Vv2wHC5A71Tzbx4hkKUhJC1gUn-_CRTMwVDNmdqCek95Syhsd6vZ7TbcnxO2b79cRI6L_DJtXIYGBwX4x-DEN0H7X_ChsqRSXyGLX-LIPeY2Y7hgQsOQ",
    dp: "nIgoW0kGjLkEugrcftGWnmz-NUP2ppBTiO6KQnV0lPtAUPWozvaZCz-vb-45RydNgguDV_MI7-P6ZiQVe5ERNg0D6tYuJUkNMLRrSdkkBePE6rYOYw0xmjigLDRoDcOztIh3OcOIlF-_LpVGC5sHGps8mCc6wmqh7Cit9tjsSYboZlPhAGy-BbKVULBG9vyJxx1sMP0b4HyMC1OeI7k1R_PQ8QerJOxy3DDW3SVgCt-7Ooy8NbogTuQYvKm2yhcjjlEZ0RhLBbhJwisNaW0mxaa-pu56pG2FSFxHKixy0M-Mjoq2EmclrCYeX7Y9VKR9QN4xEydKTZvEOEHuKxnJ6w",
    dq: "hTZ51sLqr3iqEjYMf7d21OjCy0G8-x_fItUDJrwG9Ws8xbs984y0pMRBwMflicSL0ZEqlkTbAMHoH_9Z6ERU-5dnuY3gUJFAZMa03FW0HWnRnjkYK_Ib2V8J4keBeDh2Zb7GliemHzcNXdioLcyzbAmRUfbbBd1Pfi7ahis2AdH809RJmr_7GBFVd2nLMRtcODLeVy6xz2EsqVHSM74vGL9vCaQfXyJE0BrTVMsGdsNIQ5E5SzOiGF8PWUsx2h-D-c1wh9rocwJ3d8EB-I2aB8DJ7W7CseOb7f5GdG1dAtC2OOnUHb9NG6gFeZ6_cPfXYiMaIc56jL-L7-JhMTNM4Q",
    qi: "ru_2PHQZyTUeWP_7hlNHDsQgz81jJNiNP6PzpT4x9S6wfjXA79cttsEl-ruSfWeEOSEm_7ULYbNtN9lNqOngC949HfB1ylrt-8lRHVw-V769NgFLMaQYOzVbxx3oY1sv1-5HLzXI8FikePaGdTPVx2uIQJmuiV5s5jr8CnUE83Etz_qtbCfxdmBQuP48BAVm8D9MVuoV7llQtKHXD2TJrfwO1OEBX1-tOqB1CBQadVT4HfG3iVoMvFLvFhcfI2UdHTCafEIGlzFndggXpwHEs0-lDWcnbgo_VfHfwLTXbE8TXmRt8a6I6DeSh4KbOzW2GgFRVqaLDFrznfUhD_Nytg",
    kid: "2011-04-29",
  };
  */

  return { mnemonic, JWK };
}

import { OthentAuth0Client } from "../../auth/auth0";
import { AxiosInstance } from "axios";
import { CommonEncodedRequestData } from "./common.types";
import { parseErrorResponse } from "../../utils/errors/error.utils";
import type { google } from "@google-cloud/kms/build/protos/protos";
import { B64String, b64ToUint8Array } from "../../utils/arweaveUtils";

// FETCH IMPORT JOB:

type ImportJob = Pick<google.cloud.kms.v1.IImportJob, "state" | "publicKey">;

interface FetchImportJobResponseData {
  importJob: ImportJob;
}

export async function fetchImportJob(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
): Promise<ImportJob> {
  const encodedData = await auth0.encodeToken({
    path: Route.FETCH_IMPORT_JOB,
  });

  let importJob: ImportJob | null = null;

  try {
    const fetchImportJobResponse = await api.post<FetchImportJobResponseData>(
      Route.FETCH_IMPORT_JOB,
      {
        encodedData,
      } satisfies CommonEncodedRequestData,
    );

    importJob = fetchImportJobResponse.data.importJob ?? null;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (importJob === null) {
    throw new Error("No importJob");
  }

  return importJob;
}

// IMPORT KEYS:

// import CryptoKeyVersionState = google.cloud.kms.v1.CryptoKeyVersion.CryptoKeyVersionState;
type CryptoKeyVersionState = string;
import { UserDetails } from "../../auth/auth0.types";
import { sleep } from "../../utils/promises/promises.utils";
import { Route } from "./common.constants";

interface ImportKeysResult {
  signKeyState: null | CryptoKeyVersionState;
  encryptDecryptKeyState: null | CryptoKeyVersionState;
}

interface ImportKeysResponseData {
  importKeysResult: ImportKeysResult;
}

export async function importKeys(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
  wrappedSignKey: null | ArrayBuffer,
  wrappedEncryptDecryptKey: null | ArrayBuffer,
) {
  const encodedData = await auth0.encodeToken({
    path: Route.IMPORT_KEYS,
    wrappedSignKey,
    wrappedEncryptDecryptKey,
  });

  let importKeysResult: ImportKeysResult | null = null;

  try {
    const importKeysResponse = await api.post<ImportKeysResponseData>(
      Route.IMPORT_KEYS,
      {
        encodedData,
      } satisfies CommonEncodedRequestData,
    );

    importKeysResult = importKeysResponse.data.importKeysResult ?? null;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (importKeysResult === null) {
    throw new Error("No importKeysResult");
  }

  return importKeysResult;
}

// ACTIVATE KEYS:

interface ActivateKeysResult {
  signKeyState: null | CryptoKeyVersionState;
  encryptDecryptKeyState: null | CryptoKeyVersionState;
  signKeyVersion: string;
  encryptDecryptKeyVersion: string;
  userDetails: null | UserDetails;
}

interface ActivateKeysResponseData {
  activateKeysResult: ActivateKeysResult;
}

export async function activateKeys(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
) {
  const encodedData = await auth0.encodeToken({
    path: Route.ACTIVATE_KEYS,
  });

  let activateKeysResult: ActivateKeysResult | null = null;

  try {
    const activateKeysResponse = await api.post<ActivateKeysResponseData>(
      Route.ACTIVATE_KEYS,
      {
        encodedData,
      } satisfies CommonEncodedRequestData,
    );

    activateKeysResult = activateKeysResponse.data.activateKeysResult ?? null;
  } catch (err) {
    throw parseErrorResponse(err);
  }

  if (activateKeysResult === null) {
    throw new Error("No activateKeysResult");
  }

  return activateKeysResult;
}

function isKeyPair(
  keyOrKeyPair: CryptoKey | CryptoKeyPair,
): keyOrKeyPair is CryptoKeyPair {
  return (
    keyOrKeyPair.hasOwnProperty("privateKey") &&
    keyOrKeyPair.hasOwnProperty("publicKey")
  );
}

// PEM conversion:

function base64ToArrayBuffer(b64: string) {
  const byteString = window.atob(b64);
  const byteArray = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }

  return byteArray;
}

type PEM =
  `-----BEGIN PRIVATE KEY-----\n${B64String}\n-----END PRIVATE KEY-----`;

export function pemToUint8Array(pem: PEM) {
  const pemBufferString = pem
    .replaceAll("\n", "")
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "") as B64String;

  // return base64ToArrayBuffer(pemBufferString);
  return b64ToUint8Array(pemBufferString);
}

async function cryptoKeyFromPEM(pem: PEM) {
  console.log(`PEM to convert =`, pem);

  return window.crypto.subtle.importKey(
    // "pkcs8",
    "spki",
    pemToUint8Array(pem),
    {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" }, // or SHA-512
    },
    false,
    ["wrapKey", "encrypt"],
  );
}

export async function testClientKeyGenerationAndWrapping(
  api: AxiosInstance,
  auth0: OthentAuth0Client,
) {
  console.log("\ntestClientKeyGenerationAndWrapping()\n");

  // await createImportJob("Job3");
  // Generate a 32-byte key to import.
  // const targetKey = crypto.randomBytes(32);
  // const [importJob] = await client.getImportJob({name: importJobName});
  // Wrap the target key using the import job key
  /*
  const wrappedTargetKey = crypto.publicEncrypt(
    {
      key: testPEM,
      oaepHash: 'sha256',
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    targetKey
  );
  */
  // const res = await importTheKey('Job3', 'Key', processedKey)

  const importJob = await fetchImportJob(api, auth0);

  console.log("importJob =", importJob);

  const wrappingKeyPEM = importJob.publicKey?.pem;

  if (!wrappingKeyPEM) throw new Error("No PEM");

  let wrappingKey: CryptoKey | null = null;

  try {
    wrappingKey = await cryptoKeyFromPEM(wrappingKeyPEM as PEM);

    console.log("wrappingKey =", wrappingKey);
  } catch (err) {
    console.error("Error importing wrapping key:", err);
  }

  if (!wrappingKey) throw new Error("No wrappingKey");

  /*
  const wrappingKeyPair = await crypto.subtle.generateKey({
    name: "RSA-OAEP",
    modulusLength: 3072,
    // publicExponent: new Uint8Array([1,0,1]),
    hash: "SHA-256",
  }, false, ["wrapKey", "unwrapKey", "encrypt", "decrypt"]);

  console.log("wrappingKeyPair =", wrappingKeyPair);

  if (!isKeyPair(wrappingKeyPair)) {
    throw new Error("`wrappingKeyPair` should be a key pair.");
  }

  const wrappingKey = wrappingKeyPair.publicKey;
  const unwrappingKey = wrappingKeyPair.privateKey;
  */

  // See https://crypto.stackexchange.com/questions/12090/using-the-same-rsa-keypair-to-sign-and-encrypt

  // Matches RSA_SIGN_PSS_4096_SHA256 used on the backend for signing.
  // TODO: Can be added as ASYMMETRIC_DECRYPT on toip of ASYMMETRIC_SIGN.
  const signKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );

  console.log("signKeyPair =", signKeyPair);

  // Matches GOOGLE_SYMMETRIC_ENCRYPTION
  // TODO: Is this incorrect in the docs, as it says RSA in there.
  // TODO: How can these 2 exported keys be imported to ArConnect. It looks like ArConnect generates a single RSA key
  // and uses that one for encryption/decyrption as well (with padding).
  const encryptDecryptKey = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  console.log("encryptDecryptKey =", encryptDecryptKey);

  if (isKeyPair(encryptDecryptKey)) {
    throw new Error("`encryptDecryptKey` should be a single key.");
  }

  // See https://crypto.stackexchange.com/questions/54348/what-is-the-difference-between-wrapping-a-key-and-encrypting
  // See https://stackoverflow.com/questions/48038395/wrapping-an-rsa-private-key-with-aes-key-and-then-unwrapping
  // See https://github.com/safebash/OpenCrypto

  // SIGN RSA key cannot easily be wrapped with `wrapKey`, we must use `exportKey` + ``encrypt

  /*
  const wrappedSignPrivateKey = await crypto.subtle.wrapKey(
    "spki",
    signKeyPair.privateKey,
    wrappingKey,
    wrappingKey.algorithm.name,
  );

  console.log("wrappedSignPrivateKey =", wrappedSignPrivateKey);
  */

  /*
  const wrappedSignPrivateKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    wrappingKey,
    await crypto.subtle.exportKey("raw", signKeyPair.privateKey),
  );
  */

  /*
  const recoveredKey = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.decrypt(unwrappingKey.algorithm.name, unwrappingKey, wrappedSignPrivateKey),
    {
      name: "RSA-PSS",
      hash: "SHA-256"
    },
    true,
    ["sign", "verify"],
  );

  const ciphertext = await crypto.subtle.encrypt({
    name: "RSA-OAEP",
  }, signKeyPair.publicKey, new TextEncoder().encode("my secret"));

  const plaintextBuffer = await crypto.subtle.decrypt({
    name: "RSA-OAEP",
  }, signKeyPair.privateKey, ciphertext);
  // }, recoveredKey, ciphertext);

  const plaintext = new TextDecoder().decode(plaintextBuffer);

  console.log("plaintext =", plaintext);
  */

  // ENCRYPT_DECRYPT AES key can easily be wrapped with `wrapKey`:

  const wrappedEncryptDecryptPrivateKey = await crypto.subtle.wrapKey(
    "raw",
    encryptDecryptKey,
    wrappingKey,
    wrappingKey.algorithm.name,
  );

  /*
  const wrappedEncryptDecryptPrivateKey2 = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    wrappingKey,
    await crypto.subtle.exportKey("raw", encryptDecryptKey),
  );

  const recovered1 = await crypto.subtle.unwrapKey(
    "raw",
    wrappedEncryptDecryptPrivateKey,
    unwrappingKey,
    unwrappingKey.algorithm.name,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  const recovered2 = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.decrypt(unwrappingKey.algorithm.name, unwrappingKey, wrappedEncryptDecryptPrivateKey2),
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt({
    name: "AES-GCM",
    length: 256,
    iv,
  }, recovered1, new TextEncoder().encode("my secret"));

  const plaintextBuffer = await crypto.subtle.decrypt({
    name: "AES-GCM",
    length: 256,
    iv,
  }, recovered2, ciphertext);

  const plaintext = new TextDecoder().decode(plaintextBuffer);

  console.log(plaintext);
  */

  const importKeysResult = await importKeys(
    api,
    auth0,
    null,
    wrappedEncryptDecryptPrivateKey,
  );

  console.log("importKeysResult =", importKeysResult);

  const MAX_ATTEMPTS = 5;
  const INTERVAL = 1000;

  let attempt = 0;
  let activateKeysResult: ActivateKeysResult | null = null;

  do {
    activateKeysResult = await activateKeys(api, auth0);

    console.log("activateKeysResult =", activateKeysResult);

    await sleep(INTERVAL);
  } while (!activateKeysResult?.userDetails && ++attempt <= MAX_ATTEMPTS);
}
