/**
 * Verify the given message. This function assumes (and requires) a user is logged in.
 * @param signature The signature to verify.
 * @returns The signed version of the message.
 */
export async function verifyMessage(
  data: any,
  signature: any,
  publicKey: string,
  options = { hashAlgorithm: "SHA-256" },
): Promise<boolean> {
  const dataToVerify = new Uint8Array(data);

  const binarySignature = new Uint8Array(signature);

  const hash = new Uint8Array(
    await crypto.subtle.digest(options.hashAlgorithm, dataToVerify),
  );

  const publicJWK: JsonWebKey = {
    e: "AQAB",
    ext: true,
    kty: "RSA",
    n: publicKey,
  };

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    publicJWK,
    {
      name: "RSA-PSS",
      hash: options.hashAlgorithm,
    },
    false,
    ["verify"],
  );

  const result = await crypto.subtle.verify(
    { name: "RSA-PSS", saltLength: 32 },
    cryptoKey,
    binarySignature,
    hash,
  );

  return result;
}
