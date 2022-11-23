FROM node:16.18.0
WORKDIR /usr/src/app

# first install all dependencies (this step gets cached)
RUN apt-get update && \
    apt-get -y install --no-install-recommends \
    build-essential \
    curl ntp wget git libssl-dev openssl \
    make gcc g++ autoconf automake \
    python build-essential \
    vim



# next copy all files (except files and dirs in .dockerignore) to container
# when a file changes, then only from this part on will the Dockerfile get executed, the rest is cached
COPY package.json package-lock.json lerna.json ./

# all installed (root)dependencies are now cached
# do not install devDependencies
RUN npm ci

# copy all package-lock files (bash: find -name "package-lock.json" -not -path "**/node_modules/*")
COPY packages/p2p/package-lock.json ./packages/p2p/package-lock.json
RUN true
COPY packages/extended-joi/package-lock.json ./packages/extended-joi/package-lock.json
RUN true
COPY packages/client/package-lock.json ./packages/client/package-lock.json
RUN true
COPY packages/interfaces/package-lock.json ./packages/interfaces/package-lock.json
RUN true
COPY packages/ed/package-lock.json ./packages/ed/package-lock.json
RUN true
COPY packages/utils/package-lock.json ./packages/utils/package-lock.json
RUN true
COPY packages/main/package-lock.json ./packages/main/package-lock.json
RUN true
COPY packages/base/package-lock.json ./packages/base/package-lock.json
RUN true
COPY packages/database-postgres/package-lock.json ./packages/database-postgres/package-lock.json
RUN true
COPY packages/logger/package-lock.json ./packages/logger/package-lock.json
RUN true
COPY packages/protobuf/package-lock.json ./packages/protobuf/package-lock.json
RUN true
COPY packages/cli/package-lock.json ./packages/cli/package-lock.json
RUN true
COPY packages/protobuf/package-lock.json ./packages/protobuf/package-lock.json
RUN true
COPY packages/web-ed/package-lock.json ./packages/web-ed/package-lock.json
RUN true
COPY packages/web-base/package-lock.json ./packages/web-base/package-lock.json
RUN true
COPY packages/machine-learning/package-lock.json ./packages/machine-learning/package-lock.json
RUN true
COPY packages/tracer/package-lock.json ./packages/tracer/package-lock.json
RUN true
COPY packages/json-sql/package-lock.json ./packages/json-sql/package-lock.json
RUN true


# copy all package.json files
COPY packages/p2p/package.json ./packages/p2p/package.json
RUN true
COPY packages/extended-joi/package.json ./packages/extended-joi/package.json
RUN true
COPY packages/client/package.json ./packages/client/package.json
RUN true
COPY packages/interfaces/package.json ./packages/interfaces/package.json
RUN true
COPY packages/ed/package.json ./packages/ed/package.json
RUN true
COPY packages/utils/package.json ./packages/utils/package.json
RUN true
COPY packages/main/package.json ./packages/main/package.json
RUN true
COPY packages/type-validation/package.json ./packages/type-validation/package.json
RUN true
COPY packages/base/package.json ./packages/base/package.json
RUN true
COPY packages/database-postgres/package.json ./packages/database-postgres/package.json
RUN true
COPY packages/transaction-pool/package.json ./packages/transaction-pool/package.json
RUN true
COPY packages/logger/package.json ./packages/logger/package.json
RUN true
COPY packages/protobuf/package.json ./packages/protobuf/package.json
RUN true
COPY packages/cli/package.json ./packages/cli/package.json
RUN true
COPY packages/protobuf/package.json ./packages/protobuf/package.json
RUN true
COPY packages/web-ed/package.json ./packages/web-ed/package.json
RUN true
COPY packages/web-base/package.json ./packages/web-base/package.json
RUN true
COPY packages/machine-learning/package.json ./packages/machine-learning/package.json
RUN true
COPY packages/tracer/package.json ./packages/tracer/package.json
RUN true
COPY packages/network/package.json ./packages/network/package.json
RUN true
COPY packages/json-sql/package.json ./packages/json-sql/package.json
RUN true


# install all depdencies for packages/*
RUN npm run lerna:bootstrap

# copy the rest of the code
COPY . .

# compile all TypeScript files
RUN npm run lerna:tsc
EXPOSE 4096

# gets overriden in docker-compose.yml file
CMD [ "npm", "start" ]
