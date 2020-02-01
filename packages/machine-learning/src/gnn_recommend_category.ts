const csvToJson = require('csvtojson');
const jsrecommender = require('js-recommender');
const bayes = require('bayes');
const HashMap = require('hashmap');

export const getPredictionCategory = dataset => {
  const jsrecommender = require('js-recommender');
  const recommender = new jsrecommender.Recommender();

  const setTable = dataset => {
    const table = new jsrecommender.Table();
    for (const item of dataset) {
      const [ProductName, CustomerName, PurchaseAmount, ProductCategory] = item;
      // console.log(ProductName, CustomerName, PurchaseAmount, ProductCategory);
      table.setCell(ProductName, CustomerName, PurchaseAmount, ProductCategory);
    }
    return table;
  };

  const table = setTable(dataset);
  const model = recommender.fit(table);
  console.log('my model');
  console.log(model);

  const predicted_table = recommender.transform(table);

  console.log('PREDICTED_TABLE', predicted_table);

  const top_predicted_category_count = 0;
  let top_predicted_category_name = '';

  let top_predicted_product_amount = 0;
  let top_predicted_product_name = '';

  const top_predicted_category_count2 = 0;
  const top_predicted_category_name2 = '';

  const top_predicted_product_amount2 = 0;
  let top_predicted_product_name2 = '';
  let top_predicted_product_name3 = '';
  let top_predicted_product_name4 = '';
  let top_predicted_product_name5 = '';

  const classifier = bayes();

  classifier.learn('Soda, Soup, Yogurt, Bread, Cheese', 'Dairy');
  classifier.learn('Peas, Lettuce, Beans, Carrots', 'Greens');
  classifier.learn('Oranges, Peaches, Pears, Blackberries', 'Fruit');

  const top_product_map = new HashMap();
  for (let i = 0; i < predicted_table.columnNames.length; ++i) {
    const customer = predicted_table.columnNames[i];
    console.log('Customer: ' + customer + ' ACTUAL vs PREDICTED SALES - ');
    for (let j = 0; j < predicted_table.rowNames.length; ++j) {
      const product = predicted_table.rowNames[j];
      const actual_amt = Math.round(table.getCell(product, customer));
      const predicted_amt = Math.round(
        predicted_table.getCell(product, customer)
      );
      const amt = top_product_map.get(product);
      console.log('product ' + product + ' amt: ' + amt);
      if (amt == null) {
        top_product_map.set(product, actual_amt);
        console.log('null product ' + product + ' amt: ' + amt);
      } else {
        const new_amt = actual_amt + amt;
        top_product_map.set(product, new_amt);
        console.log('else product ' + product + ' amt: ' + new_amt);
      }

      console.log(
        'Product [' +
          product +
          '] ACTUAL SALE TODAY: ' +
          Math.round(table.getCell(product, customer))
      );
      console.log(
        'Product [' +
          product +
          '] PREDICTED SALE TODAY ' +
          Math.round(predicted_table.getCell(product, customer))
      );
    }
  }

  console.log(
    '---------------- ALL SALES --------------------------------------'
  );

  const amt_array = [];
  const name_array = [];
  for (const entry of top_product_map.entries()) {
    amt_array.push(entry[1]);
  }

  const topValues = amt_array.sort((a, b) => b - a).slice(0, 5);

  console.log('Top values', topValues); // [ 1, 2, 3, 8, 12 ]
  console.log(topValues); // [ 1, 2, 3, 8, 12 ]

  for (const entry of top_product_map.entries()) {
    console.log(entry);
    console.log('entry ' + entry[0] + ' 1: ' + entry[1]);

    if (entry[1] == amt_array[0]) {
    }

    if (entry[1] == amt_array[1]) {
      top_predicted_product_name2 = entry[0];
    }

    if (entry[1] == amt_array[2]) {
      top_predicted_product_name3 = entry[0];
    }

    if (entry[1] == amt_array[3]) {
      top_predicted_product_name4 = entry[0];
    }

    if (entry[1] == amt_array[4]) {
      top_predicted_product_name5 = entry[0];
    }

    if (top_predicted_product_amount < entry[1]) {
      top_predicted_product_amount = entry[1];
      top_predicted_product_name = entry[0];
    }
  }
  console.log(
    '---------------- ALL SALES --------------------------------------'
  );

  top_predicted_category_name = classifier.categorize(
    top_predicted_product_name
  );

  const result = `TOMORROWS TOP PURCHASED CATEGORY: ${top_predicted_category_name}<br>
                    TOMORROWS TOP PURCHASED PRODUCT: ${top_predicted_product_name} Amount: ${top_predicted_product_amount}<br>
                    TOMORROWS TOP2 PURCHASED PRODUCT: ${top_predicted_product_name2}<br>
                    TOMORROWS TOP3 PURCHASED PRODUCT: ${top_predicted_product_name3}<br>
                    TOMORROWS TOP4 PURCHASED PRODUCT: ${top_predicted_product_name4}<br>
                    TOMORROWS TOP5 PURCHASED PRODUCT: ${top_predicted_product_name5}`;

  console.log(
    'TOMORROWS TOP2 PURCHASED PRODUCT  ' + top_predicted_product_name2
  );

  console.log(
    'TOMORROWS TOP3 PURCHASED PRODUCT  ' + top_predicted_product_name3
  );

  console.log(
    'TOMORROWS TOP4 PURCHASED PRODUCT  ' + top_predicted_product_name4
  );
  console.log(
    'TOMORROWS TOP5 PURCHASED PRODUCT  ' + top_predicted_product_name5
  );

  console.log('##############################################');
  console.log(
    'TOMORROWS TOP PURCHASED PRODUCT  ' +
      top_predicted_product_name +
      ' Amount ' +
      top_predicted_product_amount
  );
  console.log(
    'TOMORROWS TOP PURCHASED CATEGORY ' + top_predicted_category_name
  );

  console.log('##############################################');
  return result;

  const recommender1 = new jsrecommender.Recommender({
    alpha: 0.02, // learning rate
    lambda: 0.0, // regularization parameter
    iterations: 800, // maximum number of iterations in the gradient descent algorithm
    kDim: 2, // number of hidden features for each movie
  });
  // for (let i = 0; i < predicted_table.columnNames.length; ++i) {
  //   let user = predicted_table.columnNames[i];
  //   console.log('-----------------------------------------');

  //   console.log('For Customer: ' + user);
  //   for (let j = 0; j < predicted_table.rowNames.length; ++j) {
  //     let product = predicted_table.rowNames[j];
  //     console.log(
  //       'Product [' +
  //         product +
  //         '] actual purchase ' +
  //         Math.round(table.getCell(product, user))
  //     );
  //     let current_predicted_product_count = Math.round(predicted_table.getCell(product, user));
  //     if (top_predicted_product_count < current_predicted_product_count) {
  //       top_predicted_product_count = current_predicted_product_count;
  //       top_predicted_product_name = product;
  //     }
  //     console.log(
  //       'Product [' +
  //         product +
  //         '] predicted likelyhood of purchase : ' +
  //         Math.round(predicted_table.getCell(product, user))
  //     );
  //     console.log('**************************');
  //   }
  // }

  // // cat lookup
  // if (top_predicted_product_name == 'Milk') {
  //   top_predicted_category_name = 'Dairy';
  // }

  //     console.log('##############################################');
  //     console.log('TOMORROWS TOP PURCHASED PRODUCT  ' + top_predicted_product_name + ' Amount ' + top_predicted_product_count);
  //     console.log('TOMORROWS TOP PURCHASED CATEGORY ' + top_predicted_category_name);

  //     console.log('##############################################');

  // let recommender1 = new jsrecommender.Recommender({
  //   alpha: 0.02, // learning rate
  //   lambda: 0.0, // regularization parameter
  //   iterations: 800, // maximum number of iterations in the gradient descent algorithm
  //   kDim: 2, // number of hidden features for each movie
  // });
};
// module.exports = getPredictionCategory;
