const detector = require('anomaly-detector');

export function fraudDetection() {
  const randomVariables = {
    a: [18, 15, 16, 17, 14, 15, 16],
    b: [110, 130, 125, 124, 128, 118, 119],
    c: [110, 115, 113, 114, 90, 116, 90],
  };

  const options = {
    data_source: {
      name: 'memory',
    },
  };

  // by default, detector is storing training data in mongo database
  detector.init(options, function() {
    detector.train(randomVariables, function(distributions) {
      console.log('fraud detection training finished!');
      console.log(distributions);
      detector.close();
    });
  });
}
