# GNY Blockchain

__Dependencies__
```
sudo apt-get install curl ntp wget git libssl-dev openssl make gcc g++ autoconf automake python build-essential -y

sudo apt-get install libtool libtool-bin -y

# Install nvm
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash
# This loads nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

nvm install 8.13
```
__Important__  
> Follow [this Tutorial](https://docs.docker.com/install/linux/docker-ce/ubuntu/) to install __Docker__ and [this Tutorial](https://docs.docker.com/compose/install/) to install __Docker-Compose__.

<br/>
<br/>

## Run Tests

To run the unit tests, simple run:
```bash
npm run test
```

To run the integration tests you need to first login as the root user (because of docker):
```bash
sudo -s
npm run test:integration
```



## Installation

### 1 Clone Repository

Clone this repository:
```bash
git clone https://github.com/gnyio/gny-experiment
```

### 2 Install Node Dependencies

Install exactly the dependencies from `package-lock.json` with `npm ci`:
```bash
npm ci
```

### 3 Transpile Files with TypeScript

Execute:
```bash
npm run tsc
```

### 4 Start Node

```
# start POSTGRESQL database on port 3000
sudo docker run --env POSTGRES_PASSWORD=docker --env POSTGRES_DB=postgres --env POSTGRES_USER=postgres -p 3000:5432 postgres

# open new console and change directory
cd dist

# start blockchain
node app
```

Default ports:
| Service | Port | Where to change |
| :--: | :--: | :--: |
| Postgres | 3000 | `ormconfig.json` |
| Redis | 3001 | `ormconfig.json` |
| Blockchain-API | 4096 | `config.json` |
| Blockchain-P2P | 4096+1 | Can't be changed! Always API-Port +1 |

> __Attention__
> After changing ports be sure to rebuild the project with `npm run tsc`


# Extra: Run whole Blockchain only in Docker
First build the image for the `node.js` Blockchain node and the `postgres` database:
```bash
sudo docker-compose build
```

Then start both services:
```bash
sudo docker-compose up
```


# Docker 101

## Images
### Show all images
```bash
sudo docker image ls
```
### Get bash into image
```bash
sudo docker run -it 99f5bbbb1a69 /bin/bash
```

## Containers
### Show all running containers
```bash
sudo docker ps --all
```
### Bash into running container
```bash
sudo docker exec -it 650e76a2d377 /bin/bash
```

## Delete everything
### Stop all running containers
```bash
sudo docker stop $(sudo docker ps --all --quiet)
```

### Delete all stopped containers
```bash
sudo docker rm $(sudo docker ps --all --quiet)
```