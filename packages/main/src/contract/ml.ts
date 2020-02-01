import { getPrediction } from '@gny/machine-learning';
import { getPredictionCategory } from '@gny/machine-learning';
import { getPredictionTimeseries } from '@gny/machine-learning';
import { filterOutliers } from '@gny/machine-learning';
import { fraudDetection } from '@gny/machine-learning';
import { locationPrediction } from '@gny/machine-learning';
import { nlp } from '@gny/machine-learning';
import { Mldata } from '@gny/database-postgres';
import { Prediction } from '@gny/database-postgres';

export default {
  async uploadData(
    id,
    ProductName,
    CustomerName,
    PurchaseAmount,
    ProductCategory,
    ProductSubCategory1,
    ProductSubCategory2,
    PurchaseLocationStreet,
    PurchaseLocationCity,
    PurchaseLocationState,
    PurchaseLocationZipcode,
    PurchaseDate
  ) {
    const sender = this.sender;

    const exists = await global.app.sdb.load<Mldata>(Mldata, {
      address: sender.address,
      id: String(id),
      ProductName,
    });
    if (exists) return 'id already used';

    const mlData = {
      address: sender.address,
      id: String(id),
      ProductName,
      CustomerName,
      PurchaseAmount: String(PurchaseAmount),
      ProductCategory,
      ProductSubCategory1,
      ProductSubCategory2,
      PurchaseLocationStreet,
      PurchaseLocationCity,
      PurchaseLocationState,
      PurchaseLocationZipcode,
      PurchaseDate,
    };
    await global.app.sdb.create(Mldata, mlData);
  },
  async getPrediction() {
    const data = await global.app.sdb.findAll(Mldata, { condition: {} });

    // empty dict
    const formattedData = {};

    for (const item of data) {
      const { CustomerName, ProductName, PurchaseAmount } = item;

      formattedData[CustomerName] = formattedData[CustomerName] || {};

      formattedData[CustomerName][ProductName] = Number(PurchaseAmount);
    }
    getPrediction(formattedData);
  },
  async filterOutliers() {
    console.log(
      '---------------- FRAUD --------------------------------------'
    );
    const anomoly = filterOutliers([
      8160,
      8160,
      6160,
      22684,
      8,
      4,
      60720,
      1380,
      1380,
      57128,
      1000000000000,
    ]);
    console.log('out ' + anomoly[0]);
  },
  async fraudDetection() {
    fraudDetection();
  },
  async locationPrediction() {
    locationPrediction();
  },
  async nlp() {
    nlp();
  },
  async getPredictionCategory() {
    const sender = this.sender;
    const senderId = sender.address;

    const data = await global.app.sdb.findAll(Mldata, {
      condition: {
        address: senderId,
      },
    });

    if (!data || data.length === 0) {
      return 'no data yet to process';
    }

    const formattedData = [];
    for (const item of data) {
      let { PurchaseAmount } = item;
      PurchaseAmount = Number(PurchaseAmount);
      const { ProductName, CustomerName, ProductCategory } = item;
      formattedData.push([
        ProductName,
        CustomerName,
        PurchaseAmount,
        ProductCategory,
      ]);
    }

    const result = await getPredictionCategory(formattedData);
    const exists = await global.app.sdb.load(Prediction, {
      address: senderId,
    });
    if (!exists) {
      await global.app.sdb.create(Prediction, {
        address: senderId,
        prediction: String(result),
      });
    } else {
      await global.app.sdb.update(
        Prediction,
        {
          prediction: String(result),
        },
        {
          address: senderId,
        }
      );
    }
  },
  async getPredictionLocation() {
    const data = await global.app.sdb.findAll(Mldata, { condition: {} });
    const formattedData = [];
    for (const item of data) {
      const {
        ProductName,
        CustomerName,
        PurchaseAmount,
        ProductCategory,
      } = item;
      formattedData.push([
        ProductName,
        CustomerName,
        PurchaseAmount,
        ProductCategory,
      ]);
    }
    console.log(formattedData);
    // getPreLoc(formattedData);
  },
};
