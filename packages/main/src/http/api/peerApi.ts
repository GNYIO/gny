import * as express from 'express';
import { Request, Response } from 'express';
import {
  IScope,
  Next,
  IHttpApi,
  ApiResult,
  PeersWrapper,
  VersionWrapper,
  PeerInfoWrapper,
} from '@gny/interfaces';
import Peer from '../../core/peer.js';
import { StateHelper } from '../../core/StateHelper.js';

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
    router.get('/connections', this.getConnections);
    router.get('/info', this.info);
    router.get('/version', this.version);

    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .send({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/peers', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url);
      this.library.logger.error(err);

      return res.status(500).send({ success: false, error: err.toString() });
    });
  };

  private getConnections = (req: Request, res: Response, next: Next) => {
    const peers = Peer.p2p.getAllConnections();
    return res.json(peers);
  };

  private getPeers = (req: Request, res: Response, next: Next) => {
    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/peers',
      statusCode: '200',
    });

    const peers = Peer.p2p.getAllConnectedPeersPeerInfo();
    const result: ApiResult<PeersWrapper> = {
      success: true,
      peers,
      count: peers.length,
    };
    return res.json(result);
  };

  private info = (req: Request, res: Response, next: Next) => {
    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/peers/info',
      statusCode: '200',
    });

    const result: ApiResult<PeerInfoWrapper> = {
      success: true,
      ...Peer.p2p.info(),
      publicIp: this.library.config.publicIp,
      address: this.library.config.address,
    };
    return res.json(result);
  };

  private version = (req: Request, res: Response, next: Next) => {
    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/peers/version',
      statusCode: '200',
    });

    const result: ApiResult<VersionWrapper> = {
      success: true,
      version: this.library.config.version,
      build: this.library.config.buildVersion,
      net: this.library.config.netVersion,
    };
    return res.json(result);
  };
}
