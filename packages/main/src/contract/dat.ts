import { Context } from '@gnyio/interfaces';
import { IDatMaker, IDat } from '@gnyio/interfaces';

import { DatMaker } from '@gnyio/database-postgres';
import { Dat } from '@gnyio/database-postgres';
import { isUrl, isDatMaker, isDatNameOnly, isDatHash } from '@gnyio/utils';

export default {
  async registerDatMaker(this: Context, name, desc) {
    if (arguments.length !== 2) return 'Invalid arguments length';
    if (
      this.sender.publicKey &&
      this.sender.publicKey !== this.trs.senderPublicKey
    ) {
      return 'collission attack attempt';
    }

    if (!isDatMaker(name)) return 'Invalid dat maker name';
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
    if (
      this.sender.publicKey &&
      this.sender.publicKey !== this.trs.senderPublicKey
    ) {
      return 'collission attack attempt';
    }

    if (!isDatNameOnly(name)) return 'Invalid dat name';

    if (!isDatHash(hash)) return 'Invalid dat hash';

    if (!isDatMaker(makerId)) return 'Invalid dat maker name';

    if (url.length > 255) return 'Dat url too long';
    if (!isUrl(url)) return 'Invalid dat url';

    const fullName = `${makerId}.${name}`;

    const existsHash = await global.app.sdb.exists<Dat>(Dat, { hash: hash });
    if (existsHash) return 'Dat with hash already exists';

    const existsName = await global.app.sdb.exists<Dat>(Dat, {
      name: fullName,
    });
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

    await global.app.sdb.lock(`dat.createDat@${fullName}`);
    await global.app.sdb.lock(`dat.createDat@${hash}`);
    // should not be possible that the same maker is creating multiple dats
    // in one block, otherwise the counter would be wrong
    await global.app.sdb.lock(`dat.createDat@${makerId}`);

    const dat: IDat = {
      name: fullName,
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
