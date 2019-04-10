sudo docker stop $(sudo docker ps --all --quiet);
sudo docker rm $(sudo docker ps --all --quiet);

if [ -d "./dist" ]; then
  cd dist && sudo docker-compose up --detach && cd ..
fi

if [ -d "./dist1" ]; then
  cd dist1 && sudo docker-compose up --detach && cd ..
fi
