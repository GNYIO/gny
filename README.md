# GNY Blockchain

## 1 Install

Clone this repository:
```bash
git clone https://github.com/gnyio/gny-experiment
```

## 2 Install Dependencies

Install exactly the dependencies from `package-lock.json` with `npm ci`:
```bash
npm ci
```

## 3 Create database and cache

Create a database with the user `postgres`. 

```bash
psql --u postgres
CEATEDB gny_test;
```

- Edit database config file `ormconfig.json`
  - You could also modify this file to deploy your own database connection or edit `SmartDB.init()` with configOptions.
  - For testing some nodes, you should use `configOptions` so that several database configs can be established and you should first create the corresponding database such as `gny_test1`, `gny_test2`...

Run cache database on `Redis`, the default port is 6379.

```bash
redis-server
```

## 4 Transpile Files with TypeScript

Execute:
```bash
npm run tsc
```

## 5 Start Blockchain

Change directory to the `dist` dir and start the Blockchain:
```

cd dist
node app
```


## 6 Run many Nodes

Specify the amount of `[nodes]` you want to create. You can create up to 101.

Example create `10` nodes:
```bash
node createSecondNode.js 10
```

After we have created the nodes launch them:

```bash
node launchAllNodes.js
```

