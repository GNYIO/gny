sudo docker stop $(sudo docker ps --all --quiet);
sudo docker rm $(sudo docker ps --all --quiet);

if [ -d "./dist" ]; then
  cd dist && sudo docker-compose up --detach
fi
