import { Context } from '@gny/interfaces';
import { INftMaker, INft } from '@gny/interfaces';

import { NftMaker } from '@gny/database-postgres';
import { Nft } from '@gny/database-postgres';

export default {
  async registerNftMaker(this: Context, name, desc) {
    if (arguments.length !== 2) return 'Invalid arguments length';
    if (!/^[A-Za-z]{1,16}$/.test(name)) return 'Invalid nft maker name';
    global.app.validate('description', desc);
    if (desc.length > 100) return 'Invalid description';

    const senderId = this.sender.address;
    await global.app.sdb.lock(`uia.registerNftMaker@${senderId}`);
    const exists = await global.app.sdb.exists<NftMaker>(NftMaker, { name });
    if (exists) return 'Nft maker name already exists';

    const maker: INftMaker = {
      name,
      desc,
      address: senderId,
      tid: this.trs.id,
    };
    await global.app.sdb.create<NftMaker>(NftMaker, maker);
    return null;
  },

  async createNft(this: Context, name, cid, makerId) {
    if (arguments.length !== 3) return 'Invalid arguments length';

    // TODO: validate name
    // TODO: validate cid

    const existsCid = await global.app.sdb.exists<Nft>(Nft, { cid });
    if (existsCid) return 'Nft with cid already exists';

    const existsName = await global.app.sdb.exists<Nft>(Nft, { cid });
    if (existsName) return 'Nft with name already exists';

    const existsMakerId = await global.app.sdb.exists<NftMaker>(NftMaker, {
      name: makerId,
    });
    if (!existsMakerId) {
      return 'Provided NftMaker does not exist';
    }

    await global.app.sdb.lock(`uia.createNft@${name}`);
    await global.app.sdb.lock(`uia.createNft@${cid}`);

    const nft: INft = {
      name,
      cid,
      prevNft: undefined,
      makerId: makerId,
    };
    await global.app.sdb.create<Nft>(Nft, nft);
    return null;
  },

  async transferNft(this: Context) {},
};
