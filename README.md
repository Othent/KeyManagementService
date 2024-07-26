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

1.  Use [`pnpm version`](https://docs.npmjs.com/cli/v7/commands/npm-version) to bump the version, which will also make sure
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

    The `preversion`, `version` and `postversion` scripts defined in `package.json` will test, format, build, tag and push all the changes automatically.

2.  To publish a stable release, simply run [`pnpm publish`](https://docs.npmjs.com/cli/v8/commands/npm-publish).

    The `latest` tag will also point to this new version.

    If you are publishing a pre-release version and don't want the `latest` tag to be updated, run this instead:

        pnpm publish --tag $(node -p -e "require('./package.json').version")

<br />

### Troubleshooting

If you accidentally updated the `latest` tag, you can point it to another version with the following command:

    npm dist-tag add @othent/kms@<version> latest

You can see the package distribution (not version) tags like this:

    npm view . dist-tags

If you added / pushed an incorrect tag, you can delete it from the server with:

    git push origin :refs/tags/v0.1.0

And locally with:

    git tag -d v0.1.0
