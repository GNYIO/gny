import * as util from 'util'
import Router from './utils/router'

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

interface Wrapper {
  class: any;
  name: string;
}

let interfaceFiles: Array<Wrapper> = [
  { class: uia, name: 'uia' }
]


export default async function loadInterfaces(routes) {

  for (const file of interfaceFiles) {
   global.app.logger.info('loading interface', file)
    const rw = new RouteWrapper()
    file.class(rw)
    const router1 = new Router()
    let router = router1.router
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
      rw.path = `/api/v2/${file.name}`
    }
    routes.use(rw.path, router);
  }
}
