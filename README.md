# GNY Blockchain

__Dependencies__
```
sudo apt-get install curl sqlite3 ntp wget git libssl-dev openssl make gcc g++ autoconf automake python build-essential -y

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

## 1 Install

Clone this repository:
```bash
git clone https://github.com/gnyio/gny-experiment
```

## 2 Install Node Dependencies

Install exactly the dependencies from `package-lock.json` with `npm ci`:
```bash
npm ci
```

## 3 Transpile Files with TypeScript

Execute:
```bash
npm run tsc
```

## 4 Start ONE Node

Change directory to the `dist` directory and start the docker containers of postgresql and redis and then the Blockchain:
```
# change directory
cd dist

# start postgres and redis
sudo docker-compose up --detach

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


## 5 Start MANY Nodes

First delete the `dist/` directory:
```
rm -rf dist
```

Next make a clean build:
```
npm run tsc
```

Specify the amount of `[nodes]` you want to create. You can create up to 101.

Example create `10` nodes:
```bash
sudo node createSecondNode.js 10
```

After we have created the nodes launch all of them:
```bash
sudo node launchAllNodes.js
```
