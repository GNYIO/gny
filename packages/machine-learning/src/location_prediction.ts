const jsrecommender = require('js-recommender');
const csvToJson = require('csvtojson');

// Read data from CSV file
const setTable = async () => {
  const table = new jsrecommender.Table();
  const recipients = await csvToJson({
    trim: true,
  }).fromFile('./WalmartRetailDataNJ_July_Location.csv');
  return recipients;
};

// Get longitude and latitude from an address

const NodeGeocoder = require('node-geocoder');

const transformAddress = async address => {
  const options = {
    provider: 'opencage',
    apiKey: '98d3bf5edd684188938b9e8978e2c5d5',
  };

  const geocoder = NodeGeocoder(options);

  const data = await geocoder.geocode(address);
  return data;
};

// transformAddress('35 Broadway Montclair')

// Feed data to k-means

export async function locationPrediction() {
  // const locationPrediction = async () => {
  const recipients = await setTable();
  const data = [];
  for (let i = 0; i < 10; i++) {
    // console.log(recipients[i]);
    const item = {};
    item['PurchaseStoreName'] = recipients[i].PurchaseStoreName;
    const address =
      recipients[i].PurchaseLocationStreet +
      ' ' +
      recipients[i].PurchaseLocationCity;
    const response = await transformAddress(address);
    const { longitude, latitude } = response[0];
    item['latitude'] = Number(latitude);
    item['longitude'] = Number(longitude);
    console.log(item);
    data.push(item);
  }
  // console.log(data);

  // Create the data 2D-array (vectors) describing the data
  const vectors = new Array();
  for (let i = 0; i < data.length; i++) {
    vectors[i] = [data[i]['latitude'], data[i]['longitude']];
  }

  const kmeans = require('node-kmeans');
  kmeans.clusterize(vectors, { k: 4 }, (err, res) => {
    if (err) console.error(err);
    else console.log('%o', res);
  });
}
