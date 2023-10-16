const dotenv = require('dotenv');
dotenv.config();

const googleApplicationCredentials = JSON.parse(
  process.env.GOOGLE_APPLICATION_CREDENTIALS
);

const propertyId = '308596586';

// Imports the Google Analytics Data API client library.
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const {
  getCountryCitySlugToDestinationMap,
} = require('./get-countrycityslug-destination-map');

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
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'FULL_REGEXP',
                value: `/(${productsFilter})/destinations/.*/.*/$`,
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
    metricFilter: {
      filter: {
        fieldName: 'screenPageViews',
        numericFilter: {
          operation: 'GREATER_THAN',
          value: {
            doubleValue: 1,
          },
        },
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
  let slugToDestinationMapping = await getCountryCitySlugToDestinationMap(
    products,
    market
  );

  const resultWithDestinationData = response.rows
    .map((row) => {
      const slug = row.dimensionValues[0].value;
      const splittedUrl = slug.split('/');

      const countryInSlug = splittedUrl[3];
      const cityInSlug = splittedUrl[4];
      const countryCitySlug = `${countryInSlug}/${cityInSlug}/`;
      const destinationCode = slugToDestinationMapping[countryCitySlug]?.code;
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
  if (products.length === 1) return resultWithDestinationData;

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
    .sort((a, b) => (b.pageViews = a.pageViews));

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
