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

## 3 Transpile Files with TypeScript

Execute:
```bash
npm run tsc
```

## 4 Start Blockchain

Change directory to the `dist` dir and start the Blockchain:
```

cd dist
node app
```


## 5 Run many Nodes

Specify the amount of `[nodes]` you want to create. You can create up to 101.

Example create `10` nodes:
```bash
node createSecondNode.js 10
```

After we have created the nodes launch them:

```bash
node launchAllNodes.js
```
