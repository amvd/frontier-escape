(function () {
  'use-strict'

  class FlightsAnalyzer {
    constructor (rawData) {
      this.deals = this._extractDeals(rawData)
      this._mapDeals()

      console.log(this.deals)
    }

    matchDeals (origin) {
      console.log(`Finding matches for ${origin}`)
      const matches = {}
      const dealMap = this.dealMap
      if (!dealMap[origin]) {
        console.error(`Could not find deals for origin: ${origin}.`)
        return
      }

      const departures = dealMap[origin].departures

      let iDeparture = departures.length
      while (iDeparture--) {
        const outboundTrip = departures[iDeparture]
        if (!dealMap[outboundTrip.ToCity]) { continue }

        if (matches[outboundTrip.ToCity]) {
          matches[outboundTrip.ToCity].outbound.push(outboundTrip)
          if (outboundTrip.Price < matches[outboundTrip.ToCity].lowestOutbound) {
            matches[outboundTrip.ToCity].lowestOutbound = outboundTrip.Price
            recalculateLowestRoundtrip(matches[outboundTrip.ToCity])
          }
          continue
        } else {
          matches[outboundTrip.ToCity] = {
            outbound: [],
            inbound: [],
            lowestOutbound: Infinity,
            lowestInbound: Infinity,
            lowestRoundTrip: Infinity
          }
        }
        const matchObject = matches[outboundTrip.ToCity]

        let iInbound = dealMap[outboundTrip.ToCity].departures.length

        while (iInbound--) {
          const inboundTrip = dealMap[outboundTrip.ToCity].departures[iInbound]

          if (inboundTrip.ToCity !== origin) { continue }

          matchObject.inbound.push(inboundTrip)

          if (inboundTrip.Price < matchObject.lowestInbound) {
            matchObject.lowestInbound = inboundTrip.Price
            recalculateLowestRoundtrip(matchObject)
          };
        }
      }

      // this._writeToFile(`${Date.now()}_from_${origin.replace(/ /g, "_")}`, matches, "search_results")

      return matches

      function recalculateLowestRoundtrip (matchObject) {
        matchObject.lowestRoundTrip = matchObject.lowestOutbound + matchObject.lowestInbound
      }
    }

    matchCities (city1, city2) {
      const firstCityDeals = this.matchDeals(city1)
      const secondCityDeals = this.matchDeals(city2)
      const matches = {}

      for (let destination in firstCityDeals) {
        if (!secondCityDeals[destination]) { continue }

        matches[destination] = {}

        matches[destination][`${city1} Flights`] = firstCityDeals[destination]
        matches[destination][`${city2} Flights`] = secondCityDeals[destination]
      }

      return matches
    }

    citiesList () {
      if (!this.cities) {
        const cities = []

        for (let city in this.dealMap) {
          cities.push(city)
        }

        this.cities = cities
      }

      return this.cities
    }

    _extractDeals (rawData) {
      let resultArray = []
      let airports = []

      let iGroup = rawData.length
      while (iGroup--) {
        let group = rawData[iGroup]

        airports.push(group.FromCity)

        let iDeals = group.Deals.length
        while (iDeals--) {
          resultArray.push(group.Deals[iDeals])
        };
      }
      console.log(`Found ${resultArray.length} deals!`)
      return resultArray
    }

    _mapDeals () {
      const deals = this.deals
      const links = {}

      let i = deals.length
      while (i--) {
        const deal = deals[i]
        if (!links[deal.FromCity]) {
          links[deal.FromCity] = {
            departures: []
          }
        }
        const linkObject = links[deal.FromCity]

        linkObject.departures.push(deal)
      }

      this.dealMap = links
    }
  }

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = FlightsAnalyzer
  } else {
    if (typeof define === 'function' && define.amd) {
      define([], function () {
        return FlightsAnalyzer
      })
    } else {
      window.FlightsAnalyzer = FlightsAnalyzer
    }
  }
})()
