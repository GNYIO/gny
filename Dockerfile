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
COPY package.json package-lock.json lerna.json ./

# all installed (root)dependencies are now cached
RUN npm ci

# copy all package-lock files (bash: find -name "package-lock.json" -not -path "**/node_modules/*")
COPY packages/p2p/package-lock.json ./packages/p2p/package-lock.json
COPY packages/extendedJoi/package-lock.json ./packages/extendedJoi/package-lock.json
COPY packages/client/package-lock.json ./packages/client/package-lock.json
COPY packages/interfaces/package-lock.json ./packages/interfaces/package-lock.json
COPY packages/ed/package-lock.json ./packages/ed/package-lock.json
COPY packages/utils/package-lock.json ./packages/utils/package-lock.json
COPY packages/main/package-lock.json ./packages/main/package-lock.json
COPY packages/base/package-lock.json ./packages/base/package-lock.json
COPY packages/database-postgres/package-lock.json ./packages/database-postgres/package-lock.json
COPY packages/logger/package-lock.json ./packages/logger/package-lock.json
COPY packages/cli/package-lock.json ./packages/cli/package-lock.json
COPY packages/protobuf/package-lock.json ./packages/protobuf/package-lock.json

# copy all package.json files
COPY packages/p2p/package.json ./packages/p2p/package.json
COPY packages/extendedJoi/package.json ./packages/extendedJoi/package.json
COPY packages/client/package.json ./packages/client/package.json
COPY packages/interfaces/package.json ./packages/interfaces/package.json
COPY packages/ed/package.json ./packages/ed/package.json
COPY packages/utils/package.json ./packages/utils/package.json
COPY packages/main/package.json ./packages/main/package.json
COPY packages/type-validation/package.json ./packages/type-validation/package.json
COPY packages/base/package.json ./packages/base/package.json
COPY packages/database-postgres/package.json ./packages/database-postgres/package.json
COPY packages/transaction-pool/package.json ./packages/transaction-pool/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/cli/package.json ./packages/cli/package.json
COPY packages/protobuf/package.json ./packages/protobuf/package.json

# install all depdencies for packages/*
RUN npm run lerna:bootstrap

# copy the rest of the code
COPY . .

# compile all TypeScript files
RUN npm run lerna:tsc
EXPOSE 4096

# gets overriden in docker-compose.yml file
CMD [ "npm", "start" ]
