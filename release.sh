#!/bin/bash
set -e
# Any subsequent(*) commands which fail will cause the shell script to exit immediately

releaseType=$1
token=$2
tokenLength=${#token}

if [ $# -eq 0 ]; then
  echo "No arguments provided"
  echo "call with (patch | minor | major) 123456"
  exit 1
fi

# check if token is correct
if [ ! $tokenLength == 6 ]
then
  echo "token is not in correct format"
  exit 1
fi



if [[ $releaseType == "patch" ]]
then
  echo "start patch release"
  node_modules/lerna/cli.js version patch --yes --exact
fi

if [[ $releaseType == "minor" ]]
then
  echo "start minor release"
  node_modules/lerna/cli.js version minor --yes --exact
fi

if [[ $releaseType == "major" ]]
then
  echo "start major release"
  node_modules/lerna/cli.js version major --yes --exact
fi


# build client prior to publish (for the browser files)
node_modules/lerna/cli.js run --scope="@gny/client" web



# publish client
cd packages/client && npm publish --access=public --token=$token && cd ../..
# publish web-base
# cd packages/web-base && npm publish --access=public --token=$token && cd ../..
# # publish web-ed
# cd packages/web-ed && npm publish --access=public --token=$token && cd ../..
# # publish interfaces
# cd packages/interfaces && npm publish --access=public --token=$token && cd ../..
# # publish utils
# cd packages/utils && npm publish --access=public --token=$token && cd ../..

# # publish cli
# cd packages/cli && npm publish --access=public --token=$token && cd ../..
# # pubilsh base
# cd packages/base && npm publish --access=public --token=$token && cd ../..
# # publish ed
# cd packages/ed && npm publish --access=public --token=$token && cd ../..
# # publish extended-joi
# cd packages/extended-joi && npm publish --access=public --token=$token && cd ../..
# # publish logger
# cd packages/logger && npm publish --access=public --token=$token && cd ../..
# # publish type-validation
# cd packages/type-validation && npm publish --access=public --token=$token && cd ../..
