/*
 * This function retrieves destination data for each product from the product site api and builds a mapping of country/city slugs to their corresponding destination objects.
 * {'united-kingdom/st-andrews/': {
    name: 'St Andrews',
    code: 'GB-SAD',
    description: 'a very nice city',
    full_slug: 'de/lt/destinations/united-kingdom/st-andrews'
  },
  'united-kingdom/eastbourne/': {
    name: 'eastbourne',
    code: 'GB-EAS',
    description: 'Eastbourne ist eine klassische Strandstadt ',
    full_slug: 'de/upa/destinations/united-kingdom/eastbourne/'
  },
  }
 */

export const getCountryCitySlugToDestinationMap = async (products, market) => {
  let slugToDestinationMapping = {};

  for (const eachProduct of products) {
    const responsedestination = await fetch(
      `https://rhps-api.martech.eflangtech.com/v2/destinationsStories/${market}/${eachProduct}`
    );
    const responsedestinationJSON = await responsedestination.json();

    responsedestinationJSON.forEach((eachDestination) => {
      const splittedUrl = eachDestination.full_slug
        .split('/')
        .filter((each) => !!each); //Need to add this condition cause in the api results some slugs end with a '/' and some don't
      const countryCitySlug = splittedUrl.slice(-2).join('/') + '/';
      slugToDestinationMapping[countryCitySlug] = eachDestination;
    });
  }
  return slugToDestinationMapping;
};
