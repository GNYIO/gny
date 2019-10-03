import * as express from 'express';
import { Request, Response } from 'express';
import { IScope, Next, IHttpApi } from '@gny/interfaces';
import Peer from '../../../src/core/peer';
import { StateHelper } from '../../../src/core/StateHelper';

export default class PeerApi implements IHttpApi {
  private library: IScope;
  constructor(library: IScope) {
    this.library = library;

    this.attachApi();
  }

  public attachApi = () => {
    const router = express.Router();

    router.use((req: Request, res: Response, next) => {
      if (StateHelper.BlockchainReady()) return next();
      return res
        .status(500)
        .send({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/', this.getPeers);
    router.get('/version', this.version);

    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .send({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/peers', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url, err.toString());
      return res.status(500).send({ success: false, error: err.toString() });
    });
  };

  private getPeers = (req: Request, res: Response, next: Next) => {
    const peers = Peer.p2p.getAllConnectedPeers();
    return res.json({
      peers,
      count: peers.length,
    });
  };

  private version = (req: Request, res: Response, next: Next) => {
    return res.json({
      version: this.library.config.version,
      build: this.library.config.buildVersion,
      net: this.library.config.netVersion,
    });
  };
}