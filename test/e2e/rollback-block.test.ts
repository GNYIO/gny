/*
sudo docker-compose --file config/integration/docker-compose.integration.yml up --no-start
sleep 5
sudo docker-compose --file config/integration/docker-compose.integration.yml start db1
sleep 10

cat config/e2e/network-fork/dump_height_11_node2.sql | sudo docker exec -i db1 psql -U postgres

sudo docker-compose --file config/integration/docker-compose.integration.yml up -d

sudo docker exec -t db1 psql -P pager=off --user postgres --command "select * from block;"
*/
