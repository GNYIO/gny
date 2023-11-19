import { Context } from '@gny/interfaces';
import { INftMaker, INft } from '@gny/interfaces';

import { NftMaker } from '@gny/database-postgres';
import { Nft } from '@gny/database-postgres';
import {
  urlRegex,
  nftMakerRegex,
  nftNameRegex,
  nftHashRegex,
} from '@gny/utils';

export default {
  async registerNftMaker(this: Context, name, desc) {
    if (arguments.length !== 2) return 'Invalid arguments length';
    if (!nftMakerRegex.test(name)) return 'Invalid nft maker name';
    global.app.validate('description', desc);
    if (desc.length > 100) return 'Invalid description';

    const senderId = this.sender.address;

    // can't register the same nft maker within the same block
    // different lock strategy then usual
    await global.app.sdb.lock(`nft.registerNftMaker@${name}`);
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

  async createNft(this: Context, name, hash, makerId, url) {
    if (arguments.length !== 4) return 'Invalid arguments length';

    if (!nftNameRegex.test(name)) return 'Invalid nft name';

    if (!nftHashRegex.test(hash)) return 'Invalid nft hash';

    if (!nftMakerRegex.test(makerId)) return 'Invalid nft maker name';

    if (typeof url !== 'string') return 'Invalid nft url type';
    if (url.length > 255) return 'Nft url too long';
    if (!urlRegex.test(url)) return 'Invalid nft url';

    const existsHash = await global.app.sdb.exists<Nft>(Nft, { hash: hash });
    if (existsHash) return 'Nft with hash already exists';

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

    await global.app.sdb.lock(`nft.createNft@${name}`);
    await global.app.sdb.lock(`nft.createNft@${hash}`);
    // should not be possible that the same maker is creating multiple nfts
    // in one block, otherwise the counter would be wrong
    await global.app.sdb.lock(`nft.createNft@${makerId}`);

    const nft: INft = {
      name,
      hash,
      previousHash: previousHash,
      tid: this.trs.id,
      counter: String(increasedCounter),
      nftMakerId: maker.name,
      ownerAddress: maker.address,
      timestamp: this.trs.timestamp,
      url,
    };
    await global.app.sdb.create<Nft>(Nft, nft);

    await global.app.sdb.update<NftMaker>(
      NftMaker,
      { nftCounter: String(increasedCounter) },
      { name: makerId }
    );

    return null;
  },
};
