FROM node:8.13
WORKDIR /usr/src/app

# first install all dependencies (this step gets cached)
RUN apt-get update && \
    apt-get -y install --no-install-recommends \
    build-essential \
    curl ntp wget git libssl-dev openssl \
    make gcc g++ autoconf automake \
    python build-essential

# next copy only package.json and package-lock.json for installation
COPY package.json package-lock.json ./
# all installed dependencies are now cached
RUN npm ci

# next copy all files (except files and dirs in .dockerignore) to container
# when a file changes, then only from this part on will the Dockerfile get executed, the rest is cached
COPY . .

# compile all TypeScript files
RUN npm run tsc
EXPOSE 4096

CMD [ "npm", "start" ]
