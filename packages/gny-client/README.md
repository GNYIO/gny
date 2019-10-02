# GNY Client

## Installion

Install exactly the dependencies from `package-lock.json` with `npm ci`:

```bash
npm ci
```

## Usage

```typescript
import { Connection } from '@gny/gny-client';

const connection = new Connection();
const accountApi = connection.api('Account');

const generateAccount = async () => {
  response = await accountApi..generateAccount();
  console.log(response);
};

generateAccount();

```

See tests for more examples.


## Connection configuration

```typescript
const connection = new Connection(host?, port?, network?);

```

### Default value

```json
{
  "host": "127.0.0.1",
  "port": 4096,
  "network": "testnet"
}
```









