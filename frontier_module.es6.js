(function () {
  'use-strict';

  class FlightsAnalyzer {
    constructor (rawData) {
      this.deals = this._extractDeals(rawData);
      this._mapDeals();

      // console.log(this.deals)
    }

    matchDeals (origin) {
      console.log(`Finding matches for ${origin}`);
      const matches = {};
      const dealMap = this.dealMap;
      if (!dealMap[origin]) {
        console.error(`Could not find deals for origin: ${origin}.`);
        return;
      }

      const departures = dealMap[origin].departures;

      let iDeparture = departures.length;
      while (iDeparture--) {
        const outboundTrip = departures[iDeparture];
        const destinationCode = outboundTrip.ToCity;
        if (!dealMap[destinationCode]) { continue; }

        if (matches[destinationCode]) {
          matches[destinationCode].outbound.push(outboundTrip);
          if (outboundTrip.Price < matches[destinationCode].lowestOutbound) {
            matches[destinationCode].lowestOutbound = outboundTrip.Price;
            recalculateLowestRoundtrip(matches[destinationCode]);
          }
          continue;
        } else {
          matches[destinationCode] = {
            outbound: [outboundTrip],
            inbound: [],
            lowestOutbound: outboundTrip.Price,
            lowestInbound: Infinity,
            lowestRoundTrip: Infinity
          };
        }
        const matchObject = matches[destinationCode];

        let iInbound = dealMap[outboundTrip.ToCity].departures.length;

        while (iInbound--) {
          const inboundTrip = dealMap[outboundTrip.ToCity].departures[iInbound];

          if (inboundTrip.ToCity !== origin) { continue; }

          matchObject.inbound.push(inboundTrip);

          if (inboundTrip.Price < matchObject.lowestInbound) {
            matchObject.lowestInbound = inboundTrip.Price;
            recalculateLowestRoundtrip(matchObject);
          };
        }
      }

      // this._writeToFile(`${Date.now()}_from_${origin.replace(/ /g, "_")}`, matches, "search_results")

      return matches;

      function recalculateLowestRoundtrip (matchObject) {
        matchObject.lowestRoundTrip = matchObject.lowestOutbound + matchObject.lowestInbound;
      }
    }

    matchCities (city1, city2) {
      const firstCityDeals = this.matchDeals(city1);
      const secondCityDeals = this.matchDeals(city2);
      const matches = {};

      for (let destination in firstCityDeals) {
        if (!secondCityDeals[destination]) { continue; }

        matches[destination] = {};

        matches[destination][`${city1} Flights`] = firstCityDeals[destination];
        matches[destination][`${city2} Flights`] = secondCityDeals[destination];
      }

      return matches;
    }

    get citiesList () {
      if (!this.cities) {
        const cities = [];

        for (let city in this.dealMap) {
          if (!this.dealMap.hasOwnProperty(city)) {
            continue;
          }
          cities.push(city);
        }

        this.cities = cities;
      }

      return this.cities;
    }

    get airportCodes () {
      return this.citiesList;
    }

    _extractDeals (rawData) {
      let resultArray = [];
      // let airports = []

      let iGroup = rawData.length;
      while (iGroup--) {
        let group = rawData[iGroup];

        // airports.push(group.FromCity)

        let iDeals = group.Deals.length;
        while (iDeals--) {
          const newDeal = group.Deals[iDeals];
          newDeal.ToCity = extractIATACode(newDeal.ToCity);
          newDeal.FromCity = extractIATACode(newDeal.FromCity);
          resultArray.push(newDeal);
        };
      }
      console.log(`Found ${resultArray.length} deals!`);
      return resultArray;
    }

    _mapDeals () {
      const deals = this.deals;
      const links = {};

      let i = deals.length;
      while (i--) {
        const deal = deals[i];
        const originCode = deals[i].FromCity;
        if (!links[originCode]) {
          links[originCode] = {
            departures: []
          };
        }
        const linkObject = links[originCode];

        linkObject.departures.push(deal);
      }

      this.dealMap = links;
    }
  }

  function extractIATACode (airportName) {
    return airportName.match(/\((...)\)/)[1];
  }

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = FlightsAnalyzer;
  } else {
    /* eslint-disable */
    if (typeof define === 'function' && define.amd) {
      define([], function () {
        return FlightsAnalyzer
      })
    } else {
      window.FlightsAnalyzer = FlightsAnalyzer
    }
    /* eslint-enable */
  }
})();
