# @othent/kms

The Othent KMS package.

Please find code examples on how to use this package at https://github.com/Othent/KMS-test-repo.

## TODO / Ideas / Improvements / Questions

- Can we inject window.arweaveWallet so that this works with existing apps?

- Tutorial to build a simple Arweave dApp using a wallet and then updating it to use Othent?

- Why is the `getTokenSilently()`'s cache disabled? Why is the Auth0 client re-created every time?

- Are we sending the whole file to Auth0 to include it in a JWT? Wouldn't it make more sense to include only a hash and verify it on the server?

- React-specific hook library/SDK (e.g. Wagmi)?
