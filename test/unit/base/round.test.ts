import { RoundBase } from '@gny/base';

describe('base/round', () => {
  describe('calculateRound', () => {
    it('calculateRound() - height 0', () => {
      const height = String(0);
      const result = RoundBase.calculateRound(height);

      expect(result).toEqual(String(0));
    });

    it('calculateRound() - height 1', done => {
      const height = String(1);
      const result = RoundBase.calculateRound(height);

      expect(result).toEqual(String(1));
      done();
    });

    it('calculateRound() - height 20', done => {
      const height = String(20);
      const result = RoundBase.calculateRound(height);

      expect(result).toEqual(String(1));
      done();
    });

    it('calculateRound() - height 65', done => {
      const height = String(65);
      const result = RoundBase.calculateRound(height);

      expect(result).toEqual(String(1));
      done();
    });

    it('calculateRound() - height 101', done => {
      const height = String(101);
      const result = RoundBase.calculateRound(height);

      expect(result).toEqual(String(1));
      done();
    });

    it('calculateRound() - height 102', done => {
      const height = String(102);
      const result = RoundBase.calculateRound(height);

      expect(result).toEqual(String(2));
      done();
    });

    it('calculateRound() - height 201', done => {
      const height = String(201);
      const result = RoundBase.calculateRound(height);

      expect(result).toEqual(String(2));
      done();
    });

    it('calculateRound() - height 202', done => {
      const height = String(202);
      const result = RoundBase.calculateRound(height);

      expect(result).toEqual(String(2));
      done();
    });

    it('calculateRound() - height 203', done => {
      const height = String(203);
      const result = RoundBase.calculateRound(height);

      expect(result).toEqual(String(3));
      done();
    });

    it('calculateRound() - height 1000', done => {
      const height = String(1000);
      const result = RoundBase.calculateRound(height);

      expect(result).toEqual(String(10));
      done();
    });
  });

  describe('getAllBlocksInRound', () => {
    it('for round 0 - returns ["0"]', () => {
      expect.assertions(1);

      const height = String(0);

      const result = RoundBase.getAllBlocksInRound(height);
      expect(result).toEqual(['0']);
    });

    it('for round 1 - returns ["1"..."101"]', () => {
      expect.assertions(2);

      const height = String(1);

      const expectedArr = [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
        '13',
        '14',
        '15',
        '16',
        '17',
        '18',
        '19',
        '20',
        '21',
        '22',
        '23',
        '24',
        '25',
        '26',
        '27',
        '28',
        '29',
        '30',
        '31',
        '32',
        '33',
        '34',
        '35',
        '36',
        '37',
        '38',
        '39',
        '40',
        '41',
        '42',
        '43',
        '44',
        '45',
        '46',
        '47',
        '48',
        '49',
        '50',
        '51',
        '52',
        '53',
        '54',
        '55',
        '56',
        '57',
        '58',
        '59',
        '60',
        '61',
        '62',
        '63',
        '64',
        '65',
        '66',
        '67',
        '68',
        '69',
        '70',
        '71',
        '72',
        '73',
        '74',
        '75',
        '76',
        '77',
        '78',
        '79',
        '80',
        '81',
        '82',
        '83',
        '84',
        '85',
        '86',
        '87',
        '88',
        '89',
        '90',
        '91',
        '92',
        '93',
        '94',
        '95',
        '96',
        '97',
        '98',
        '99',
        '100',
        '101',
      ];

      const result = RoundBase.getAllBlocksInRound(height);

      expect(result).toEqual(expectedArr);
      expect(result.length).toEqual(101);
    });

    it('for round 2 - returns ["102"..."202"]', () => {
      expect.assertions(2);

      const height = String(2);

      const expectedArr = [
        '102',
        '103',
        '104',
        '105',
        '106',
        '107',
        '108',
        '109',
        '110',
        '111',
        '112',
        '113',
        '114',
        '115',
        '116',
        '117',
        '118',
        '119',
        '120',
        '121',
        '122',
        '123',
        '124',
        '125',
        '126',
        '127',
        '128',
        '129',
        '130',
        '131',
        '132',
        '133',
        '134',
        '135',
        '136',
        '137',
        '138',
        '139',
        '140',
        '141',
        '142',
        '143',
        '144',
        '145',
        '146',
        '147',
        '148',
        '149',
        '150',
        '151',
        '152',
        '153',
        '154',
        '155',
        '156',
        '157',
        '158',
        '159',
        '160',
        '161',
        '162',
        '163',
        '164',
        '165',
        '166',
        '167',
        '168',
        '169',
        '170',
        '171',
        '172',
        '173',
        '174',
        '175',
        '176',
        '177',
        '178',
        '179',
        '180',
        '181',
        '182',
        '183',
        '184',
        '185',
        '186',
        '187',
        '188',
        '189',
        '190',
        '191',
        '192',
        '193',
        '194',
        '195',
        '196',
        '197',
        '198',
        '199',
        '200',
        '201',
        '202',
      ];

      const result = RoundBase.getAllBlocksInRound(height);

      expect(result).toEqual(expectedArr);
      expect(result.length).toEqual(101);
    });

    it('for round 10 returns ["910"..."1010"]', () => {
      expect.assertions(6);

      const height = String(10);

      const expectedArr = [
        '910',
        '911',
        '912',
        '913',
        '914',
        '915',
        '916',
        '917',
        '918',
        '919',
        '920',
        '921',
        '922',
        '923',
        '924',
        '925',
        '926',
        '927',
        '928',
        '929',
        '930',
        '931',
        '932',
        '933',
        '934',
        '935',
        '936',
        '937',
        '938',
        '939',
        '940',
        '941',
        '942',
        '943',
        '944',
        '945',
        '946',
        '947',
        '948',
        '949',
        '950',
        '951',
        '952',
        '953',
        '954',
        '955',
        '956',
        '957',
        '958',
        '959',
        '960',
        '961',
        '962',
        '963',
        '964',
        '965',
        '966',
        '967',
        '968',
        '969',
        '970',
        '971',
        '972',
        '973',
        '974',
        '975',
        '976',
        '977',
        '978',
        '979',
        '980',
        '981',
        '982',
        '983',
        '984',
        '985',
        '986',
        '987',
        '988',
        '989',
        '990',
        '991',
        '992',
        '993',
        '994',
        '995',
        '996',
        '997',
        '998',
        '999',
        '1000',
        '1001',
        '1002',
        '1003',
        '1004',
        '1005',
        '1006',
        '1007',
        '1008',
        '1009',
        '1010',
      ];

      const result = RoundBase.getAllBlocksInRound(height);

      expect(result.length).toEqual(101);
      expect(result).toEqual(expectedArr);

      // test bounds
      expect(RoundBase.calculateRound('909')).toEqual('9'); // one before
      expect(RoundBase.calculateRound('910')).toEqual('10'); // start
      expect(RoundBase.calculateRound('1010')).toEqual('10'); // end
      expect(RoundBase.calculateRound('1011')).toEqual('11'); // one after
    });
  });
});
