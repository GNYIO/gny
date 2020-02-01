export const getPredictionTimeseries = dataset => {
  console.log(dataset);

  const timeseries = require('timeseries-analysis');
  // Unfiltered data out of MongoDB:
  // var data = [{

  //         "amount": 26.52,
  //         "date": "2019-04-15T03:00:00.000Z"
  //     },
  //     {

  //         "amount": 26.92,
  //         "date": "2019-04-16T03:00:00.000Z"
  //     },
  //     {

  //         "amount": 26.63,
  //         "date": "2019-04-17T03:00:00.000Z"
  //     },
  //     ];

  // Load the data
  /*
  var t     = new timeseries.main(timeseries.adapter.fromDB(data, {
      date:   'date',     // Name of the property containing the Date (must be compatible with new Date(date) )
      value:  'amount'     // Name of the property containign the value. here we'll use the "close" price.
  }));

  */

  // var data = [12,16,14,13,11,10,9,11,23,45,55,122,44,66];

  // Load the data
  let t = new timeseries.main(timeseries.adapter.fromArray(dataset));

  let processed = t.ma().output();
  console.log('future time product purchase times  ' + processed);
  // var min = t.min();
  // var max = t.max(); // 72.03
  // var stdev = t.stdev(); // 3.994277911972647
  const coeffs = t.ARLeastSquare();
  console.log(
    'future time product purchase amounts above and below the std dev for the product' +
      coeffs
  );

  t = new timeseries.main(
    timeseries.adapter.complex({ cycles: 10, inertia: 0.1 })
  );
  processed = t.ma().output();
  console.log('future time product purchase times  ' + processed);
};

// module.exports = getPredictionTimeseries;
