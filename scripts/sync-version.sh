# See https://gist.github.com/moos/4635bda5b04dc8113d8ea7ee974cabc2
packageVersionFromNPM=$npm_package_version

if [ "$npm_lifecycle_event" == "foo" ] && [ -z "$packageVersionFromNPM" ]; then
    echo -e "\n\033[0;31mpackageVersionFromNPM (npm_package_version) variable is not defined!\n"
    exit 1
fi

packageVersionFromJSON=$(node -p -e "require('./package.json').version")

packageVersion="${packageVersion:-$packageVersionFromJSON}"

if [ -z "$packageVersion" ]; then
    echo -e "\033[0;31mpackageVersion variable is not defined!\n"
    exit 1
fi

if [ -n "$npm_package_name" ] && [ "$npm_lifecycle_event" == "foo" ] && [ "$packageVersionFromNPM" != "$packageVersionFromJSON" ]; then
    echo -e "\033[0;32m✔\033[0m Updating $npm_package_name from '$packageVersionFromJSON' to '$packageVersionFromNPM'..."
fi

sed -i -e "s/CLIENT_VERSION = \".*\"/CLIENT_VERSION = \"$packageVersion\"/" ./src/lib/config/config.constants.ts
# -i = in-place edit
# Note there's no g flag used in the regular expression to make sure only one line is affected (just in case).

git update-index --again
