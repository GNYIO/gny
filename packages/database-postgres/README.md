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
   - Default config is as follows
 ```json
 {
   "type": "postgres",
   "host": "localhost",
   "port": 5432,
   "username": "postgres",
   "password": "",
   "database": "gny_test",
   "synchronize": true,
   "logging": false,
   "entities": [
      "src/smartdb/entity/**/*.js"
   ],
   "migrations": [
      "src/smartdb/migration/**/*.js"
   ],
   "subscribers": [
      "src/smartdb/subscriber/**/*.js"
   ],
   "cli": {
      "entitiesDir": "src/smartdb/entity",
      "migrationsDir": "src/smartdb/migration",
      "subscribersDir": "src/smartdb/subscriber"
   }
}
 ```
   - You could also modify this file to deploy your own database connection or edit `SmartDB.init()` with configOptions in the file smartdb.ts.
- Run app in the  `root` 

```bash
$ ./rebuild.sh
```

