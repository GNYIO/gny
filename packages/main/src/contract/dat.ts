import { Context } from '@gny/interfaces';
import { IDatMaker, IDat } from '@gny/interfaces';

import { DatMaker } from '@gny/database-postgres';
import { Dat } from '@gny/database-postgres';
import {
  urlRegex,
  datMakerRegex,
  datNameRegex,
  datHashRegex,
} from '@gny/utils';

export default {
  async registerDatMaker(this: Context, name, desc) {
    if (arguments.length !== 2) return 'Invalid arguments length';
    if (!datMakerRegex.test(name)) return 'Invalid dat maker name';
    global.app.validate('description', desc);
    if (desc.length > 100) return 'Invalid description';

    const senderId = this.sender.address;

    // can't register the same dat maker within the same block
    // different lock strategy then usual
    await global.app.sdb.lock(`dat.registerDatMaker@${name}`);
    const exists = await global.app.sdb.exists<DatMaker>(DatMaker, { name });
    if (exists) return 'Dat maker name already exists';

    const maker: IDatMaker = {
      name,
      desc,
      address: senderId,
      tid: this.trs.id,
      datCounter: String(0),
    };
    await global.app.sdb.create<DatMaker>(DatMaker, maker);
    return null;
  },

  async createDat(this: Context, name, hash, makerId, url) {
    if (arguments.length !== 4) return 'Invalid arguments length';

    if (!datNameRegex.test(name)) return 'Invalid dat name';

    if (!datHashRegex.test(hash)) return 'Invalid dat hash';

    if (!datMakerRegex.test(makerId)) return 'Invalid dat maker name';

    if (typeof url !== 'string') return 'Invalid dat url type';
    if (url.length > 255) return 'Dat url too long';
    if (!urlRegex.test(url)) return 'Invalid dat url';

    const existsHash = await global.app.sdb.exists<Dat>(Dat, { hash: hash });
    if (existsHash) return 'Dat with hash already exists';

    const existsName = await global.app.sdb.exists<Dat>(Dat, { name: name });
    if (existsName) return 'Dat with name already exists';

    const existsMakerId = await global.app.sdb.exists<DatMaker>(DatMaker, {
      name: makerId,
    });
    if (!existsMakerId) {
      return 'Provided DatMaker does not exist';
    }

    const maker = await global.app.sdb.findOne<DatMaker>(DatMaker, {
      condition: {
        name: makerId,
      },
    });
    const senderId = this.sender.address;
    if (senderId !== maker.address) return 'You do not own the makerId';

    let previousHash = null;
    const increasedCounter = Number(maker.datCounter) + 1;

    let previousDat = null;
    if (increasedCounter > 1) {
      previousDat = await global.app.sdb.findOne<Dat>(Dat, {
        condition: {
          datMakerId: makerId,
          counter: maker.datCounter,
        },
      });
      previousHash = previousDat.hash;
    }

    await global.app.sdb.lock(`dat.createDat@${name}`);
    await global.app.sdb.lock(`dat.createDat@${hash}`);
    // should not be possible that the same maker is creating multiple dats
    // in one block, otherwise the counter would be wrong
    await global.app.sdb.lock(`dat.createDat@${makerId}`);

    const dat: IDat = {
      name,
      hash,
      previousHash: previousHash,
      tid: this.trs.id,
      counter: String(increasedCounter),
      datMakerId: maker.name,
      ownerAddress: maker.address,
      timestamp: this.trs.timestamp,
      url,
    };
    await global.app.sdb.create<Dat>(Dat, dat);

    await global.app.sdb.update<DatMaker>(
      DatMaker,
      { datCounter: String(increasedCounter) },
      { name: makerId }
    );

    return null;
  },
};
