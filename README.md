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

nvm use # uses node version in the .nvmrc file
nvm alias default # set node version in .nvmrc as default one
```
__Important__
> Follow [this Tutorial](https://docs.docker.com/install/linux/docker-ce/ubuntu/) to install __Docker__ and [this Tutorial](https://docs.docker.com/compose/install/) to install __Docker-Compose__.

<br/>
<br/>

## Genesis Account

All GNY tokens are first on the __genesis Account__. Use the secret below to execute contracts. If you want to use another account you need to transfer GNY from the genesis account to your new account in order to execute contracts.

```json
{
  "keypair": {
    "publicKey": "575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b",
    "privateKey": "c68434b960ef024b2a868118be7641be25e566f720a5eb12ff314022629ccc71575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b"
  },
  "address": "G4GDW6G78sgQdSdVAQUXdm5xPS13t",
  "secret": "grow pencil ten junk bomb right describe trade rich valid tuna service"
}
```



## Installation

### 1 Clone Repository

Clone this repository:
```bash
git clone https://github.com/gnyio/gny-experiment
```

### 2 Install Tools

Install exactly the dependencies from `package-lock.json` with `npm ci`:
```bash
npm ci
```

### 3 Install Lerna Packages

Bootstrap all [lerna.js](https://github.com/lerna/lerna) packages with:

```bash
npm run lerna:bootstrap
```

### 4 Transpile all Lerna Packages

Transpile all [lerna.js](https://github.com/lerna/lerna) packages with:

```bash
npm run lerna:tsc
```

### 5 Start Node

Start a postgres docker container:
```bash
# start POSTGRESQL database on port 3000
sudo docker run --env POSTGRES_PASSWORD=docker --env POSTGRES_DB=postgres --env POSTGRES_USER=postgres -p 3000:5432 postgres
```

Open a new `console` and start the GNY blockchain:
```bash
node packages/main/dist/src/app
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

<br/>

# Extra: Run whole Blockchain only in Docker

First verify that you executed the [Installation](#Installation) process.

The following command builds the image for the GNY Blockchain node and the `postgres` database:
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

<br/>



## Run Tests

Before running the unit tests be sure to have the project installed with [Installation](#Installation)

To run the unit tests, simple run:
```bash
npm run test
```

To run the integration tests you need to first login as the root user (because of docker):
```bash
sudo -s
npm run test:integration
```

<br/>



## Run Many Nodes

First rebuild the project with: `npm run lerna:tsc`

Then create the different nodes with `sudo node createSecondNode.js`
You can pass as argument how many nodes you want to run: E.g. 10 nodes `sudo node createSecondNode.js 10`

Then lauch all nodes with `sudo node launchAllNodes.js`.

If you want all nodes to stop, press `Ctrl + C`

<br/>
