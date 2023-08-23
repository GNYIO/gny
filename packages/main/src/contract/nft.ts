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
      nftCounter: String(0),
    };
    await global.app.sdb.create<NftMaker>(NftMaker, maker);
    return null;
  },

  async createNft(this: Context, name, cid, makerId) {
    if (arguments.length !== 3) return 'Invalid arguments length';

    if (!/^[a-zA-Z]{5,20}$/.test(name)) return 'Invalid nft name';
    // TODO: better validate cid
    if (!/^[a-zA-Z0-9]{59}$/.test(cid)) return 'Invalid nft CID';

    const existsCid = await global.app.sdb.exists<Nft>(Nft, { hash: cid });
    if (existsCid) return 'Nft with cid already exists';

    const existsName = await global.app.sdb.exists<Nft>(Nft, { name: name });
    if (existsName) return 'Nft with name already exists';

    const existsMakerId = await global.app.sdb.exists<NftMaker>(NftMaker, {
      name: makerId,
    });
    if (!existsMakerId) {
      return 'Provided NftMaker does not exist';
    }

    const maker = await global.app.sdb.findOne<NftMaker>(NftMaker, {
      condition: {
        name: makerId,
      },
    });
    const senderId = this.sender.address;
    if (senderId !== maker.address) return 'You do not own the makerId';

    let previousHash = null;
    const increasedCounter = Number(maker.nftCounter) + 1;

    let previousNft = null;
    if (increasedCounter > 1) {
      previousNft = await global.app.sdb.findOne<Nft>(Nft, {
        condition: {
          nftMakerId: makerId,
          counter: maker.nftCounter,
        },
      });
      previousHash = previousNft.hash;
    }

    await global.app.sdb.lock(`uia.createNft@${name}`);
    await global.app.sdb.lock(`uia.createNft@${cid}`);

    const nft: INft = {
      name,
      hash: cid,
      previousHash: previousHash,
      tid: this.trs.id,
      counter: String(increasedCounter),
      nftMakerId: maker.name,
      ownerAddress: maker.address,
    };
    await global.app.sdb.create<Nft>(Nft, nft);

    await global.app.sdb.update<NftMaker>(
      NftMaker,
      { nftCounter: String(increasedCounter) },
      { name: makerId }
    );

    return null;
  },

  async transferNft(this: Context) {},
};
