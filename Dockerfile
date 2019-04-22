FROM node:8.13
WORKDIR /usr/src/app
COPY . .
RUN apt-get update && \
    apt-get -y install --no-install-recommends \
    build-essential \
    curl ntp wget git libssl-dev openssl \
    make gcc g++ autoconf automake \
    python build-essential && \
    npm ci && \
    npm run tsc
EXPOSE 4096

CMD [ "npm", "start" ]
