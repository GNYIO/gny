FROM node:10.16.2
WORKDIR /usr/src/app

# first install all dependencies (this step gets cached)
RUN apt-get update && \
    apt-get -y install --no-install-recommends \
    build-essential \
    curl ntp wget git libssl-dev openssl \
    make gcc g++ autoconf automake \
    python build-essential



# next copy all files (except files and dirs in .dockerignore) to container
# when a file changes, then only from this part on will the Dockerfile get executed, the rest is cached
COPY . .

# all installed (root)dependencies are now cached
RUN npm ci

# install all depdencies for packages/*
RUN npm run lerna:bootstrap

# compile all TypeScript files
RUN npm run lerna:tsc
EXPOSE 4096

# gets overriden in docker-compose.yml file
CMD [ "npm", "start" ]
