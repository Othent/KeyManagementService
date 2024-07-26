# Othent KMS JS SDK

    npm install --save @othent/kms
    yarn install --save @othent/kms
    pnpm add --save @othent/kms

<br />

## Demo:

Find an example test repo using Othent KMS JS SDK [here](https://github.com/Othent/KMS-test-repo).

You can see this live on [kms-demo.othent.io](https://kms-demo.othent.io)

<img src="https://kms-demo.othent.io/othent-kms-demo-screenshot.png" />

<br />

## Publishing A New Release:

### Manually:

1.  Manually update the package version (`CLIENT_VERSION`) in `config.constants.ts`.

2.  `pnpm build`.

3.  Commit your changes.

4.  Use [`pnpm version`](https://docs.npmjs.com/cli/v7/commands/npm-version) to bump the version, which will also make sure
    the next commit has the right tags.

        **Stable release:**

        ```
        npm version patch
        npm version minor
        npm version major
        ```


        **Pre-release:**

        ```
        npm version prerelease --preid=beta
        npm version prepatch --preid=beta
        npm version preminor --preid=beta
        npm version premajor --preid=beta
        ```

5.  [`pnpm publish`](https://docs.npmjs.com/cli/v8/commands/npm-publish).

<br />

### Troubleshooting

If you accidentally updated the `latest` tag, you can point it to another version with the following command:

    npm dist-tag add @othent/kms@<version> latest

## This branch / PR:

**Beta Release:**

- [x] Playground inline inputs / log.
- [x] Playground settings form.
- [x] Test with data from old arweave: - encrypt (old) => decrypt (new) works fine. - signMessage (old) => verifyMessage (new) works fine.
- [x] Complete TSDocs using the Notion docs for now.
- [x] Manually release and document the process in the README.

**Stable Release:**

- [x] Add `.npmrc`.
- [x] Add build / publish scripts.
- [x] Add `husky` and `lit-staged` to format on commit and custom pre-commit to update/check version.
- [ ] Custom error.
- [ ] Fix signDataItem signature verification.
