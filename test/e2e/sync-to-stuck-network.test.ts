import * as lib from './lib';
import * as helpers from './helpers';
import BigNumber from 'bignumber.js';
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

async function forgingActivateDeactive(
  port: number,
  secrets: string[],
  action: 'enable' | 'disable'
) {
  const url = `http://localhost:${port}/api/delegates/forging/${action}`;

  for (let i = 0; i < secrets.length; ++i) {
    const one = secrets[i];

    const data = {
      secret: one,
      publicKey: gnyJS.crypto.getKeys(one).publicKey,
    };
    // console.log(`[${action}] for delegate: ${JSON.stringify(data, null, 2)}, url: ${url}`);
    await axios.post(url, data);
  }
}

describe('sync-to-stuck-network e2e test', () => {
  beforeAll(async done => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098]);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'sync-to-stuck-network');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'sync-to-stuck-network',
    async done => {
      await lib.sleep(30 * 1000);
      // zwei nodes beide bis höhe 6
      // stopp node2

      // warte 20 sekunden
      // dann zu node1 20 secrets hinzufügen

      // noch mal ~6 Blöcke produzieren lassen (alleine nur node1)
      // dann wieder 20 secrets von node1 entfernen

      // 1min warten
      // node2 starten und schauen ob node2 auf die gleiche Höhe kommt
      // await lib.sleep(30 * 1000);

      const forgingEnableEndpoint = '/api/delegates/forging/enable';
      const forgingDisableEndpoint = '/api/delegates/forging/disable';

      await helpers.allHeightsAreTheSame([4096, 4098]);

      // no more secrets for node2
      await forgingActivateDeactive(4098, secrets, 'disable');
      await lib.sleep(10 * 1000);

      const [temp1, temp2] = await helpers.allHeightsAreTheSame([4096, 4098]);
      console.log(`temp1: ${temp1}, temp2: ${temp2}`);

      await lib.sleep(20 * 1000);
      const [temp3, temp4] = await helpers.allHeightsAreTheSame([4096, 4098]);

      // make sure that the network isn't producing blocks
      expect(temp1).toEqual(temp3);
      expect(temp2).toEqual(temp4);

      expect(temp3).toEqual(temp4);

      await forgingActivateDeactive(4096, secrets, 'enable');
      await lib.sleep(60 * 1000);

      const [temp5, temp6] = await helpers.allHeightsAreTheSame([4096, 4098]);
      console.log(`producing blocks, node1: ${temp5}, node2: ${temp6}`);
      expect(Number(temp5)).toBeGreaterThan(Number(temp6));

      return done();
    },
    lib.oneMinute * 3
  );
});