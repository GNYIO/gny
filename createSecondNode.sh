#/bin/bash

rm -rf dist2

cp -r ./dist ./dist2

# replace 1st config
rm ./dist/config.json
cp ./config1.json ./dist/config.json

# replace 2nd config
rm ./dist2/config.json
cp ./config2.json ./dist2/config.json
