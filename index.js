const dotenv = require('dotenv');
dotenv.config();

const googleApplicationCredentials = JSON.parse(
  process.env.GOOGLE_APPLICATION_CREDENTIALS
);

const propertyId = '308596586';

// Imports the Google Analytics Data API client library.
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: googleApplicationCredentials,
});

// Runs a report Google Analytics Report.
async function getDestinationsSortedByPageViews(
  market,
  products = ['lt', 'ils', 'aya', 'upa'],
  startDate = '30daysAgo',
  endDate = 'yesterday'
) {
  const upperCaseMarket = market.toUpperCase();
  const productsFilter = products.join('|');

  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dimensions: [
      { name: 'customEvent:dest_code' },
      {
        name: 'pagePath',
      },
    ],
    metrics: [
      {
        name: 'screenPageViews',
      },
    ],
    dateRanges: [
      {
        startDate,
        endDate,
      },
    ],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: 'customEvent:dest_code',
              stringFilter: { matchType: 'FULL_REGEXP', value: '^(.*-.*)$' },
            },
          },
          {
            filter: {
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'FULL_REGEXP',
                value: `/(${productsFilter})(?:/new)?/destinations/.*/.*/$`,
              },
            },
          },
          {
            filter: {
              fieldName: 'customEvent:market_code',
              stringFilter: {
                value: upperCaseMarket,
              },
            },
          },
        ],
      },
    },
    orderBys: [
      {
        metric: {
          metricName: 'screenPageViews',
        },
        desc: true,
      },
    ],
  });

  const resultWithDestinationData = response.rows
    .map((row) => {
      const destinationCode = row.dimensionValues[0].value;
      const splittedCountryCode = destinationCode?.split('-');
      const cityCode = splittedCountryCode?.[0];
      const countryCode = splittedCountryCode?.[1];

      return {
        destinationCode,
        pageViews: Number(row.metricValues[0].value),
        products,
        cityCode,
        countryCode,
      };
    })
    .filter((each) => !!each.destinationCode);

  //Reduce Array to sum up page views of multiple Products and then sort them
  const resultDestinations = resultWithDestinationData
    .reduce((accumulator, current) => {
      const existingItem = accumulator.find(
        (item) => item.destinationCode === current.destinationCode
      );
      //Add Page views if same destinations from different product
      if (existingItem) {
        existingItem.pageViews += current.pageViews;
      } else {
        accumulator.push(current);
      }

      return accumulator;
    }, [])
    .sort((a, b) => b.pageViews - a.pageViews);

  return resultDestinations;
}

const displayReport = async () => {
  const response = await getDestinationsSortedByPageViews('de');
  console.log(JSON.stringify(response));
};
displayReport();
module.exports = {
  getDestinationsSortedByPageViews,
};
