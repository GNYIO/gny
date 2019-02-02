
const PeerInfo = require('peer-info');
const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const Bundle = require('./bundle');
const PeerId = require('peer-id');
const { createPeerInfo } = require('./createPeerInfo');
const { printPeerBook } = require('./printPeerBook')

const BOOT_NODE_URL = '/ip4/0.0.0.0/tcp/4000/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP';
const BOOT_NODE_PEER_ID = PeerId.createFromB58String('Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP');

const createSecondNode = async function() {

  const newPeerInfo = await createPeerInfo();
  newPeerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0');

  const node2 = new Bundle({
    peerInfo: newPeerInfo,
  });

  await node2.startAsync();
  return node2;
};


// main
(async () => {
  const count = Number(process.argv[2]) || 5;
  if (Number.isNaN(count)) {
    throw new Error('please pass an integer number')
  }

  const allNodes = [];
  for (let i = 0; i < count; ++i) {
    const node = createSecondNode();
    allNodes.push(node);
  }

  const nodes = await Promise.all(allNodes);
  nodes.forEach((x) => {
    // TODO: call: node.bootstrapPeerNodes
    x.dial(BOOT_NODE_URL, (err, con) => {

    });
  });

  setInterval(() => {
    nodes.forEach((oneNode, index) => {
      console.log(`peer[${index}]: ${oneNode.peerInfo.id.toB58String()}`);
      printPeerBook(oneNode.peerBook);
    });
  }, 15000);

})();