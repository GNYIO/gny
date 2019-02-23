# SmartDB

## Usage

> All the commands run on the root direction.

- Install dependencies

```bash
$ npm install
```

- Create database with the name `gny_test`
``` 
$ psql --username=postgres
$ CEATEDB gny_test;
```
- Edit database config file `ormconfig.json`
   - You could also modify this file to deploy your own database connection or edit `SmartDB.init()` with configOptions in the file smartdb.ts.
- Run `Redis`, the default port is 6379.

```bash
$ redis-server
```

- Run app in the  `root` 

```bash
$ ./rebuild.sh
```

