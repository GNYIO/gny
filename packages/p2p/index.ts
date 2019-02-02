
import { Bundle } from './bundle';
import { createPeerInfoArgs, createFromJSON } from './createPeerInfo';
const pull = require('pull-stream');
const { printPeerBook } = require('./printPeerBook');
const bootNodeSecret = require('./node.json');

const getBootstrapNodes = async function() {
  const peerId = await createFromJSON(bootNodeSecret);
  const peerInfo = await createPeerInfoArgs(peerId);
  const port = process.argv[2] || 4000;
  peerInfo.multiaddrs.add(`/ip4/0.0.0.0/tcp/${port}`);

  const node1 = new Bundle({ peerInfo });
  await node1.startAsync();

  node1.handle('/endpoint', (err, connection) => {
    pull(
      connection,
      pull.map((val) => {
        const parsed = val.toString('utf8');
        return parsed;
      }),
      pull.log(),
    );
  });
  return node1;
};

(async () => {
  const bootNode = await getBootstrapNodes();

  setInterval(() => {
    // why does bootstrap does not work? -> It works only for IPFS
    console.log(`BOOT-NODE: ${bootNode.peerInfo.id.toB58String()}`);
    printPeerBook(bootNode.peerBook);
  }, 10 * 1000);

})();

