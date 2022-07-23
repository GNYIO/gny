#!/bin/bash


# check if package jq is installed
dpkg --no-pager -l jq
if [ $? -ne 0 ]; then
  echo "package 'jq' is not installed. Exiting..."
  exit 1
fi

docker-compose --file ../../../config/integration/docker-compose.integration.yml down
docker-compose --file ../../../config/integration/docker-compose.integration.yml up -d

sleep 20

function getHeight() {
  local PREVIOUS=$(curl --silent http://localhost:4096/api/blocks/getHeight | jq .height)
  local CURRENT=$PREVIOUS

  while true;
  do
    CURRENT=$(curl --silent http://localhost:4096/api/blocks/getHeight | jq .height)

    if [[ "$PREVIOUS" != "$CURRENT" ]]; then
      break;
    fi

    sleep 1;
  done

  echo -n $CURRENT | tr -d '"';
}

node prepbase.js &


for i in {1..10}
do
  HEIGHT=$(getHeight)
  echo "height: $HEIGHT";
  docker exec -t db1 pg_dumpall -c -U postgres > "config/e2e/network-fork-with-transactions/dump_$HEIGHT.sql"
done

exit 0
