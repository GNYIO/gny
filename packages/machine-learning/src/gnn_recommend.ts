const dataset = {
  'Customer One': {
    Apples: 2.0,
    Peaches: 3.0,
    Pears: 3.0,
  },

  'Customer Two': { Apples: 3.0, Peaches: 3.0, Pears: 5.0 },

  'Customer Three': { Apples: 2.0, Peaches: 3.0, Pears: 1.0 },

  'Customer Four': { Apples: 1.0, Peaches: 3.0, Pears: 4.0 },

  'Customer Five': { Apples: 3, Peaches: 4, Pears: 3 },

  'Customer Six': { Apples: 3.0, Peaches: 4.0, Pears: 5.0 },

  'Customer Seven': { Peaches: 4, Pears: 1 },

  'Customer Eight': { Apples: 10.0, Peaches: 3.0, Pears: 1.0 },
};

export const getPrediction = dataset => {
  const euclid = Math.sqrt(Math.pow(3.5 - 2.5, 2) + Math.pow(4.0 - 3.5, 2));

  const reuclid = 1 / (1 + euclid);

  // calculate the euclidean distance btw two item
  const euclidean_score = function(dataset, p1, p2) {
    const existp1p2 = {}; // store item existing in both item

    // if dataset is in p1 and p2
    // store it in as one
    for (const key in dataset[p1]) {
      if (key in dataset[p2]) {
        existp1p2[key] = 1;
      }

      if (len(existp1p2) == 0) return 0; // check if it has a data

      const sum_of_euclidean_dist = []; // store the  euclidean distance

      // calculate the euclidean distance
      for (const item in dataset[p1]) {
        if (item in dataset[p2]) {
          sum_of_euclidean_dist.push(
            Math.pow(dataset[p1][item] - dataset[p2][item], 2)
          );
        }
      }
      let sum = 0;
      for (let i = 0; i < sum_of_euclidean_dist.length; i++) {
        sum += sum_of_euclidean_dist[i]; // calculate the sum of the euclidean
      }

      // since the sum will be small for familiar user
      // and larger for non-familiar user
      // we make it exist btwn 0 and 1

      const sum_sqrt = 1 / (1 + Math.sqrt(sum));

      return sum_sqrt;
    }
  };

  let len = function(obj) {
    let len = 0;
    for (const i in obj) {
      len++;
    }
    return len;
  };

  const es = euclidean_score(dataset, 'Customer One', 'Customer Two');

  const pearson_correlation = function(dataset, p1, p2) {
    const existp1p2 = {};

    for (const item in dataset[p1]) {
      if (item in dataset[p2]) {
        existp1p2[item] = 1;
      }
    }
    const num_existence = len(existp1p2);

    if (num_existence == 0) return 0;

    // store the sum and the square sum of both p1 and p2
    // store the product of both
    let p1_sum = 0,
      p2_sum = 0,
      p1_sq_sum = 0,
      p2_sq_sum = 0,
      prod_p1p2 = 0;
    // calculate the sum and square sum of each data point
    // and also the product of both point
    for (const item in existp1p2) {
      p1_sum += dataset[p1][item];
      p2_sum += dataset[p2][item];

      p1_sq_sum += Math.pow(dataset[p1][item], 2);
      p2_sq_sum += Math.pow(dataset[p2][item], 2);

      prod_p1p2 += dataset[p1][item] * dataset[p2][item];
    }
    const numerator = prod_p1p2 - (p1_sum * p2_sum) / num_existence;

    const st1 = p1_sq_sum - Math.pow(p1_sum, 2) / num_existence;
    const st2 = p2_sq_sum - Math.pow(p2_sum, 2) / num_existence;

    const denominator = Math.sqrt(st1 * st2);

    if (denominator == 0) return 0;
    else {
      const val = numerator / denominator;
      return val;
    }
  };

  const corr = pearson_correlation(dataset, 'Customer One', 'Customer Two');

  len = function(obj) {
    let len = 0;
    for (const i in obj) {
      len++;
    }
    return len;
  };

  const similar_user = function(dataset, person, num_user, distance) {
    const scores = [];

    for (const others in dataset) {
      if (others != person && typeof dataset[others] != 'function') {
        const val = distance(dataset, person, others);
        const p = others;
        scores.push({ val: val, p: p });
      }
    }
    scores.sort(function(a, b) {
      return b.val < a.val ? -1 : b.val > a.val ? 1 : b.val >= a.val ? 0 : NaN;
    });
    const score = [];
    for (let i = 0; i < num_user; i++) {
      score.push(scores[i]);
    }

    return score;
  };

  let su = similar_user(dataset, 'Customer One', 3, pearson_correlation);
  console.log('Most Correlated to Customer One  ');
  console.log(su);

  su = similar_user(dataset, 'Customer Two', 3, pearson_correlation);
  console.log('Most Correlated to Customer Two  ');
  console.log(su);

  const recommendation_eng = function(dataset, person, distance) {
    const totals = {
        setDefault: function(props, value) {
          if (!this[props]) {
            this[props] = 0;
          }

          this[props] += value;
        },
      },
      simsum = {
        setDefault: function(props, value) {
          if (!this[props]) {
            this[props] = 0;
          }

          this[props] += value;
        },
      },
      rank_lst = [];

    for (const other in dataset) {
      if (other === person) continue;

      const similar = distance(dataset, person, other);

      if (similar <= 0) continue;

      for (const item in dataset[other]) {
        if (!(item in dataset[person]) || dataset[person][item] == 0) {
          // the setter help to make this look nice.
          totals.setDefault(item, dataset[other][item] * similar);
          simsum.setDefault(item, similar);
        }
      }
    }

    for (const item in totals) {
      if (typeof totals[item] != 'function') {
        const val = totals[item] / simsum[item];
        rank_lst.push({ val: val, items: item });
      }
    }
    rank_lst.sort(function(a, b) {
      return b.val < a.val ? -1 : b.val > a.val ? 1 : b.val >= a.val ? 0 : NaN;
    });
    const recommend = [];
    for (const i in rank_lst) {
      recommend.push(rank_lst[i].items);
    }
    return [rank_lst, recommend];
  };

  // npm install js-recommender
  console.log('HERE AT js-recommender');

  const jsrecommender = require('js-recommender');

  let recommender = new jsrecommender.Recommender();

  const table = new jsrecommender.Table();

  // table.setCell('[movie-name]', '[user]', [score]);
  table.setCell('Apples', 'Customer One', 5);
  table.setCell('Peaches', 'Customer One', 5);
  table.setCell('Pears', 'Customer One', 0);
  table.setCell('Cheeries', 'Customer One', 0);
  table.setCell('Apples', 'Customer Two', 5);
  table.setCell('Peaches', 'Customer Two', 4);
  table.setCell('Pears', 'Customer Two', 1);
  table.setCell('Cheeries', 'Customer Two', 1);
  table.setCell('Apples', 'Customer Three', 0);
  table.setCell('Peaches', 'Customer Three', 0);
  table.setCell('Pears', 'Customer Three', 5);
  table.setCell('Cheeries', 'Customer Three', 5);
  table.setCell('Apples', 'Customer Four', 0);
  table.setCell('Peaches', 'Customer Four', 2);
  table.setCell('Pears', 'Customer Four', 4);
  table.setCell('Cheeries', 'Customer Four', 3);

  const model = recommender.fit(table);
  console.log(model);

  const predicted_table = recommender.transform(table);

  console.log(predicted_table);

  for (let i = 0; i < predicted_table.columnNames.length; ++i) {
    const user = predicted_table.columnNames[i];
    console.log('For Customer: ' + user);
    for (let j = 0; j < predicted_table.rowNames.length; ++j) {
      const product = predicted_table.rowNames[j];
      console.log(
        'Product [' +
          product +
          '] actual likelhood of purchase ' +
          Math.round(table.getCell(product, user))
      );
      console.log(
        'Product [' +
          product +
          '] predicted likelhood of purchase : ' +
          Math.round(predicted_table.getCell(product, user))
      );
    }
  }

  recommender = new jsrecommender.Recommender({
    alpha: 0.01, // learning rate
    lambda: 0.0, // regularization parameter
    iterations: 500, // maximum number of iterations in the gradient descent algorithm
    kDim: 2, // number of hidden features for each movie
  });
};

// module.exports = getPrediction;
