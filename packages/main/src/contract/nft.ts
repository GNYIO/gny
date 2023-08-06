import { Context } from '@gny/interfaces';
import { INftsMaker } from '@gny/interfaces';
import { NftMaker } from '@gny/database-postgres';

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

    const maker: INftsMaker = {
      name,
      desc,
      makerId: senderId,
      tid: this.trs.id,
    };
    console.log(JSON.stringify(maker, null, 2));
    await global.app.sdb.create<NftMaker>(NftMaker, maker);
    return null;
  },

  async createNft(this: Context) {},

  async transferNft(this: Context) {},
};
