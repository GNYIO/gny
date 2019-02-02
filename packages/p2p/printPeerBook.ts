
export function printPeerBook (peerBook) {
  const all = peerBook.getAll();
  const keys = Object.keys(all);
  const peers = keys.map((key) => all[key]);

  peers.forEach((value) => {
    const TAB = '\t';
    console.log(TAB + value.id.toB58String());
  });
}
