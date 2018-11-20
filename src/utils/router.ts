import _ from 'lodash';
import express from 'express';
import { Request, Response } from 'express';

class Router {
  public router: any = express.Router();

  constructor() {
    this.router.map = this.map;
  }

  private map(root: any, config: any) {
    Object.keys(config).forEach((params) => {
      const route = params.split(' ')
      if (route.length !== 2 || ['post', 'get', 'put'].indexOf(route[0]) === -1) {
        throw Error('Wrong router map config')
      }
      this.router[route[0]](route[1], (req: Request, res: Response) => {
        const reqParams = {
          body: route[0] === 'get' ? req.query : req.body,
          params: req.params,
        }
        root[config[params]](reqParams, (err: String, res: Response) => {
          if (err) {
            return res.json({ success: false, error: err })
          }
          return res.json(_.assign({ success: true }, res))
        })
      })
    })
  }
}

export = Router;