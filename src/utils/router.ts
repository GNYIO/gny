import * as _ from 'lodash';
import * as express from 'express';
import { Request, Response } from 'express';

export default class Router {
  public router: any = express.Router();

  constructor() {
    this.router.map = this.map;
  }

  private map(root: any, config: any) {
    Object.keys(config).forEach((param) => {
      const params = param.split(' ')
      const method = params[0];
      const route = params[1];
      if (route.length !== 2 || ['post', 'get', 'put'].indexOf(method) === -1) {
        throw Error('Wrong router map config');
      }
      this.router[method](route, (req: Request, res: Response) => {
        const reqParams = {
          body: method === 'get' ? req.query : req.body,
          params: req.params,
        }
        root[config[param]](reqParams, (err: String, res: Response) => {
          if (err) {
            return res.json({ success: false, error: err })
          }
          return res.json(_.assign({ success: true }, res))
        })
      })
    })
  }
}
