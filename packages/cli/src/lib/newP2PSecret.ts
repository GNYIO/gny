import * as PeerInfo from 'peer-info';

export default function newP2PSecret(program: any) {
  program
    .command('createp2psecret')
    .description('create new p2p secret')
    .action(create);
}

function create() {
  PeerInfo.create((err, peerInfo) => {
    if (err) {
      console.log(err);
    } else {
      console.log(JSON.stringify(peerInfo.id.toJSON(), null, 2));
    }
  });
}
