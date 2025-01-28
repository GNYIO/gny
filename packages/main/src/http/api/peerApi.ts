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
} from '@gnyio/interfaces';
import Peer from '../../core/peer.js';
import * as StateHelper from '../../core/StateHelper.js';
import { container, TYPES } from '@gnyio/container';
import { IP2PService } from '@gnyio/p2p';

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
    const p2pService = container.get<IP2PService>(TYPES.P2PService);

    const peers = p2pService.getAllConnections();
    return res.json(peers);
  };

  private getPeers = (req: Request, res: Response, next: Next) => {
    const prom = container.get<IProm>(TYPES.PrometheusService);

    prom.requests.inc({
      method: 'GET',
      endpoint: '/api/peers',
      statusCode: '200',
    });

    const p2pService = container.get<IP2PService>(TYPES.P2PService);

    const peers = p2pService.getAllConnectedPeersPeerInfo();
    const result: ApiResult<PeersWrapper> = {
      success: true,
      peers,
      count: peers.length,
    };
    return res.json(result);
  };

  private info = (req: Request, res: Response, next: Next) => {
    const prom = container.get<IProm>(TYPES.PrometheusService);

    prom.requests.inc({
      method: 'GET',
      endpoint: '/api/peers/info',
      statusCode: '200',
    });

    const p2pService = container.get<IP2PService>(TYPES.P2PService);

    const result: ApiResult<PeerInfoWrapper> = {
      success: true,
      ...p2pService.info(),
      publicIp: this.library.config.publicIp,
      address: this.library.config.address,
    };
    return res.json(result);
  };

  private version = (req: Request, res: Response, next: Next) => {
    const prom = container.get<IProm>(TYPES.PrometheusService);

    prom.requests.inc({
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
