import slots from '../../src/utils/slots';
import * as os from 'os';
import { Request, Response, Router } from 'express';
import { IScope, Next } from '../../src/interfaces';

export default class SystemApi {
  private library: IScope;

  constructor (library: IScope) {
    this.library = library;

    this.attachApi();
  }

  private attachApi = () => {
    const router = Router();

    router.get('/', this.getSystemInfo);

    router.use((req: Request, res: Response) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/system', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url, err.toString());
      return res.status(500).send({ success: false, error: err.toString() });
    });
  }
  private getSystemInfo = (req: Request, res: Response, next: Next) => {
    try {
      const lastBlock = this.library.modules.blocks.getLastBlock();

      return res.json({
        os: `${os.platform()}_${os.release()}`,
        version: this.library.config.version,
        timestamp: Date.now(),
        lastBlock: {
          height: lastBlock.height,
          timestamp: slots.getRealTime(lastBlock.timestamp),
          behind: slots.getNextSlot() - (slots.getSlotNumber(lastBlock.timestamp) + 1),
        },
      });
    } catch (err) {
      return next('Server error');
    }
  }
}