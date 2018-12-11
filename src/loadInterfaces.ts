import * as path from 'path';
import * as util from 'util';
import Router from './utils/router';

import accounts from './api/accounts';
import balances from './api/balances';
import blocks from './api/blocks';
import delegates from './api/delegates';
import proposals from './api/proposals';
import transactions from './api/transactions';
import transfers from './api/transfers';
import uia from './api/uia';


class RouteWrapper {
  hands: any[] = [];
  routePath: any = null;
  constructor() {
  }

  get(routePath, handler) {
    this.handlers.push({ path: routePath, method: 'get', handler });
  }

  put(routePath, handler) {
    this.handlers.push({ path: routePath, method: 'put', handler });
  }

  post(routePath, handler) {
    this.handlers.push({ path: routePath, method: 'post', handler });
  }

  set path(val) {
    this.routePath = val;
  }

  get path() {
    return this.routePath;
  }

  get handlers() {
    return this.hands;
  }
}

const interfaceFiles = [
  accounts,
  balances,
  blocks,
  delegates,
  proposals,
  transactions,
  transfers,
  uia
];


export default async function loadInterfaces(routes) {

  for (const f of interfaceFiles) {
    app.logger.info('loading interface', f);
    const basename = path.basename(f, '.js');
    const rw = new RouteWrapper();
    f(rw);
    const router = new Router();
    for (const h of rw.handlers) {
      router[h.method](h.path, (req, res) => {
        (async () => {
          try {
            const result = await h.handler(req);
            let response = { success: true };
            if (util.isObject(result) && !Array.isArray(result)) {
              response = _.assign(response, result);
            } else if (!util.isNullOrUndefined(result)) {
              response.data = result;
            }
            res.send(response);
          } catch (e) {
            res.status(500).send({ success: false, error: e.message });
          }
        })();
      });
    }
    if (!rw.path) {
      rw.path = `/api/v2/${basename}`;
    }
    routes.use(rw.path, router);
  }
}
