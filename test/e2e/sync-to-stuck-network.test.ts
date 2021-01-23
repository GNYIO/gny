import * as lib from './lib';
import * as helpers from './helpers';
import axios from 'axios';
import * as gnyJS from '@gny/client';

const DOCKER_COMPOSE_P2P =
  'config/e2e/sync-to-stuck-network/docker-compose.sync-to-stuck-network.yml';

const secrets = [
  'student worth gallery help patch park casino shuffle twelve ridge very rural',
  'fatigue kiwi bind gain check level file lunar fun around dash bottom',
  'action focus wrestle clinic hunt hero letter error tip unhappy turtle resource',
  'chief pulse absorb matter glad banner mountain pizza same float then item',
  'vague scorpion faint mistake weather wear above interest slow prosper foam scatter',
  'waste grain material town thank garment limit adjust merry narrow tattoo assist',
  'grief remember recycle ivory giggle damage say travel rotate again enrich witness',
  'actress acoustic spice shiver parrot rule notice palm mom segment special stumble',
  'debate sustain noise suggest road worry ring skirt near yellow banana omit',
  'castle debris oven manage invite employ orbit border split divert leaf cliff',
  'twice shy gap expose actor indicate final verify nephew legend height rug',
  'hybrid stem dust various undo upon rent hundred update east blossom reason',
  'frog version large narrow among awesome mad face habit secret elevator unfair',
  'inspire engage impact great orbit right flock liquid elbow basic shrug toss',
  'music actress sphere narrow chat convince muscle develop solve sing human punch',
  'wet margin unit palm salad thank foster wool traffic near essay lazy',
  'adjust artefact into bacon crisp depend history rubber carry guilt foil hawk',
  'chase evidence seek excite laundry treat fire verb better outdoor jazz unknown',
  'stay hint gallery earn pink craft stone entry illegal divide club slight',
  'orchard chief like crucial lumber cluster almost tag arena venture tenant alter',
  'portion route summer surround session dune supply cake romance peanut title guard',
  'coffee soap admit plate parade curtain garage diary kiwi dish witness rather',
  'spy tank all whale beach salt soon cloud violin erase brother report',
  'foil february brother timber moon army depth snake toddler file burger pottery',
  'photo chronic awesome cabbage pupil music erupt sound tourist upset sister inquiry',
  'dawn edit hour october crouch middle wheel thunder tag hold crisp library',
  'box staff muscle fox jacket asthma evoke can fortune student fiscal miss',
  'behave soldier sustain bread couch novel nominee scissors mystery vehicle glow crater',
  'whisper dutch tennis circle bag shell train bunker tornado fire future jazz',
  'remove position ring winner ride barrel miss stool bone energy inhale slight',
  'kick rhythm pulse fox fossil buyer extra december air club good work',
  'urge pelican middle horror manual card lemon track fiscal dilemma ahead minimum',
  'ugly jaguar arrive comic engage depart salon novel prize panel blind toddler',
  'west list provide need purpose lizard mercy armed glory focus carbon heart',
  'letter vintage install promote maze jeans spider grant learn mouse ocean shrug',
  'supreme seek chat potato return ticket direct script industry senior grape relief',
  'like question monitor online logic cook position click answer pole spice paddle',
  'jeans staff emerge buyer gloom issue squeeze reopen dog critic foil nest',
  'accuse plate tape mobile message stereo fossil nation stick start tray voice',
  'immune sad flee brother better piano flock crane clap asset awkward edit',
  'trap hub impulse easy trap arch gaze basket mail ticket ghost hotel',
  'future infant purchase session unhappy van scorpion trash orchard urban regular draw',
  'void across endless clever brisk bachelor minute lemon garbage dance brother head',
  'hair mimic cycle elevator cube faith pioneer bless demise spawn evoke toward',
  'jeans tip month captain student boat abuse acid fetch light bounce pause',
  'devote idle runway heavy salmon cave orbit defy until horse uncle fitness',
  'resemble illegal hockey muffin cupboard erosion under occur call fiber funny cattle',
  'ramp song example kid color seek pear lab swallow donate input seminar',
  'gather differ beef final spike cover galaxy close remind symptom husband one',
  'journey belt jar october song grid mouse pact swear mystery meat mosquito',
  'pioneer boil auction crystal mimic spike ranch laptop praise card outside misery',
];

describe('sync-to-stuck-network e2e test', () => {
  beforeAll(async done => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    console.log(`[${new Date().toLocaleTimeString()}] starting...`);

    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098, 4100]);

    console.log(`[${new Date().toLocaleTimeString()}] started.`);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    console.log(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'sync-to-stuck-network');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);

    console.log(`[${new Date().toLocaleTimeString()}] stopped.`);
    done();
  }, lib.oneMinute);

  it(
    'sync-to-stuck-network',
    async done => {
      await lib.sleep(20 * 1000);

      // start 3 nodes (25 secrets each)
      // let the network get some traction (until height e.g. 5)
      // stop node 3 a few blocks later (only kill node3) -> this node should from block 7

      // test: we have node1 and node2 at height 10
      //       we have node3 at height 7
      //       the network isn't producing blocks
      //       node3 should sync up to height 10 on its own (normally a block starts syncing when he gets a block out of line
      // goal:   all 3 nodes should be at the same height and start to

      await lib.onNewBlock(4096);
      await lib.sleep(500);
      const [before1, before2, before3] = await helpers.allHeightsAreTheSame([
        4096,
        4098,
        4100,
      ]);

      // stop and kill services db3 and node3
      await lib.onNewBlock(4096);
      await lib.sleep(500);
      await lib.stopP2PContainers(DOCKER_COMPOSE_P2P, ['db3', 'node3']);
      await lib.rmP2PContainers(DOCKER_COMPOSE_P2P, ['db3', 'node3']);

      // make
      const [stopped1, stopped2] = await helpers.allHeightsAreTheSame([
        4096,
        4098,
      ]);
      await lib.sleep(15 * 1000);
      const [stoppedAfter1, stoppedAfter2] = await helpers.allHeightsAreTheSame(
        [4096, 4098]
      );
      expect(stopped1).toEqual(stoppedAfter1);
      expect(stopped2).toEqual(stoppedAfter2);

      // start services db3 and node3
      console.log(
        `[${new Date().toLocaleTimeString()}] starting "db3" and "node3"...`
      );
      await lib.upP2PContainers(DOCKER_COMPOSE_P2P, ['db3', 'node3']);
      await lib.waitForApiToBeReadyReady(4100);
      console.log(
        `[${new Date().toLocaleTimeString()}] started "db3" and "node3"!`
      );

      await lib.sleep(40 * 1000);

      /*const [stoppedAfter1, stoppedAfter2] = */ await helpers.allHeightsAreTheSame(
        [4096, 4098, 4100]
      );

      return done();
    },
    lib.oneMinute * 7
  );
});
