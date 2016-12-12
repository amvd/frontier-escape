var http = require('http');
var fs = require('fs');
var FlightsAnalyzer = require("./frontier_module.es6");

var options = {
  host: 'f9cdn.azureedge.net',
  path: '/static/SalesDataV2.js?true=returnJson&true=returnJson'
};

callback = function(response) {
  var str = '';

  response.on('data', function (chunk) {
    str += chunk;
  });

  //the whole response has been recieved, so we just print it out here
  response.on('end', function () {
    // console.log(str);
    let data = eval(str);

    // console.log(data)

    // displayDeals(data);

    // let deals = extractDeals(data);
    const analyzer = new FlightsAnalyzer(data);

    writeToFile(`frontier_raw`, data, "raw_json")
    writeToFile(`extracted_deals`, analyzer.deals, "deals_list")
    writeToFile("cities_list", analyzer.citiesList(), "cities")

    if(process.argv[2] && process.argv[3]) {
      const matches = analyzer.matchCities(process.argv[2], process.argv[3]);
      writeToFile(`city1_${process.argv[2].replace(/ /g, "_")}_city2_${process.argv[3].replace(/ /g, "_")}`, matches, "union_results")
      console.log(matches)
    } else if(process.argv[2]) {
      const matches = analyzer.matchDeals(process.argv[2]);
      writeToFile(`from_${origin.replace(/ /g, "_")}`, matches, "search_results")
      console.log(matches)
    } else {
      // console.log(extractOrigins(data));
      // displayDeals(data);
      const dealMap = analyzer.dealMap;
      writeToFile(`dealmap`, dealMap, "dealmaps")
      // console.log(dealMap)
    }
    
  });
}

function returnJson(str) {
  return str;
}

http.request(options, callback).end();

function extractOrigins(data) {
  let cities = [];

  for (let i = 0, L = data.length; i < L; i++) {
    let origin = data[i].FromCity;
    
    if (cities.indexOf(origin) === -1) {
      cities.push(origin)
    }
  }

  return cities.sort();
}

function displayDeals(data) {
  for(let i = 0, L = data.length; i < L; i++) {
    let group = data[i];

    console.log("City: ", group.FromCity);
    console.log("Group: ", group);
    if (group.deals) {
      group.deals.forEach((deal)=>{
        console.log(deal);
      })
    }
  }
}

function extractDeals(data) {
  let resultArray = [];

  let airports = [];

  for(let i = 0, L = data.length; i < L; i++) {
    let group = data[i];

    // console.log("City: ", group.FromCity);
    airports.push(group.FromCity);

    group.Deals.forEach((deal)=>{
      resultArray.push(deal);
    });
  }
  return resultArray;
}

function mapDeals(deals) {
  const links = {};

  let i = deals.length;
  while ( i-- ) {
    const deal = deals[i];
    if ( !links[deal.FromCity] ) {
      links[deal.FromCity] = {
        departures: []
      }
    }
    const linkObject = links[deal.FromCity];

    linkObject.departures.push(deal)
  }

  writeToFile(`${Date.now()}_dealmap`, links, "dealmaps")

  return links;
}

function newMatchDeals(dealMap, origin) {
  console.log(`Finding matches for ${origin}`)
  const matches = {};

  const departures = dealMap[origin].departures;

  let iDeparture = departures.length;
  while ( iDeparture-- ) {
    const outboundTrip = departures[iDeparture];
    if ( !dealMap[outboundTrip.ToCity] ) { continue }

    if ( matches[outboundTrip.ToCity] ) {
      matches[outboundTrip.ToCity].outbound.push(outboundTrip)
      if ( outboundTrip.Price < matches[outboundTrip.ToCity].lowestOutbound ) {
        matches[outboundTrip.ToCity].lowestOutbound = outboundTrip.Price;
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
      };
    }
    const matchObject = matches[outboundTrip.ToCity];

    let iInbound = dealMap[outboundTrip.ToCity].departures.length;

    while ( iInbound-- ) {
      const inboundTrip = dealMap[outboundTrip.ToCity].departures[iInbound];

      if ( inboundTrip.ToCity != origin ) { continue }

      matchObject.inbound.push(inboundTrip)

      if ( inboundTrip.Price < matchObject.lowestInbound ) {
        matchObject.lowestInbound = inboundTrip.Price;
        recalculateLowestRoundtrip(matchObject)
      }
    }
  }

  writeToFile(`${Date.now()}_from_${origin.replace(/ /g, "_")}`, matches, "search_results")

  return matches;

  // for (let orig in dealMap) {
  //   if ( !dealMap.hasOwnProperty(orig) ) {
  //     continue
  //   }
  //   const destinations = dealMap[orig].destinations;

  //   let iDestination = destinations.length;
  //   while ( iDestination-- ) {
  //     const destination = destinations[iDestination];

  //     let isMatch = false;
  //     const branchingFlights = dealMap[destination].destinations;
  //     let iBranches = branchingFlights.length;
  //     if ( branchingFlights.indexOf )
  //   }
  // }

  function recalculateLowestRoundtrip(matchObject) {
    matchObject.lowestRoundTrip = matchObject.lowestOutbound + matchObject.lowestInbound;
  }
}

function newMatchCities(dealMap, city1, city2) {
  const firstCityDeals = newMatchDeals(dealMap, city1);
  const secondCityDeals = newMatchDeals(dealMap, city2);
  const matches = {};

  for (let destination in firstCityDeals) {
    if ( !secondCityDeals[destination] ) { continue }

    matches[destination] = {};

    matches[destination][`${city1} Flights`] = firstCityDeals[destination];
    matches[destination][`${city2} Flights`] = secondCityDeals[destination];
  }
  writeToFile(`${Date.now()}_city1_${city1.replace(/ /g, "_")}_city2_${city2.replace(/ /g, "_")}`, matches, "union_results")

  return matches;
}

function matchDeals(deals, origin) {
  let allMatches = [];
  let searchDeals = deals.slice();

  if(origin) {
    searchDeals = deals.filter((deal)=> deal.FromCity == origin)
  }

  let i = searchDeals.length;
  while ( i-- ) {
    const deal = searchDeals[i];

    let matches = deals.filter((d)=>{
      return deal.FromCity == d.toCity && deal.toCity == d.FromCity &&
        ((deal.flyStartDate <= d.flyEndDate && deal.flyEndDate >= d.flyStartDate) || (d.flyStartDate <= deal.flyEndDate && d.flyEndDate >= deal.flyStartDate))
    })

    if(matches.length > 0) {
      console.log("Coming from:", deal.FromCity)

      matches.forEach((match)=>{
        // console.log("You can fly to and from " + match.FromCity + " for $" + (deal.price + match.price));

        allMatches.push({
          origin: deal.FromCity,
          destination: match.FromCity,
          price: deal.price + match.price,
          departRange: `${deal.flyStartDate} - ${deal.flyEndDate}`,
          returnRange: `${match.flyStartDate} - ${match.flyEndDate}`,
          departDetails: deal.captionText,
          returnDetails: match.captionText
        })
      })
    }
  }

  return allMatches.sort((prev, next)=>{
    if(prev.price < next.price) {
      return -1;
    } else if (prev.price > next.price) {
      return 1;
    } else {
      return 0;
    }
  }).slice(0,100);
}

function matchCities(deals, city1, city2) {
  let allMatches = matchDeals(deals).filter((match)=>{
    return match.origin == city1 || match.origin == city2;
  });

  let doubleMatches = {};

  allMatches.forEach((match)=>{
    if(doubleMatches[match.destination]) {
      doubleMatches[match.destination].push(match);
    } else {
      doubleMatches[match.destination] = [match];
    }
  });

  for (destination in doubleMatches) {
    if(doubleMatches.hasOwnProperty(destination)) {
      if(doubleMatches[destination].length > 1) {
        console.log("Destination:", destination);

        console.log(doubleMatches[destination]);
      }
    }
  }
}

function writeToFile (filename, data, directory = ".") {
  if ( directory != "." && !fs.existsSync(directory)){
    fs.mkdirSync(directory);
  }
  const fullFilename = `${Date.now()}_${filename}`
  fs.writeFile(`${directory}/${fullFilename}.json`, JSON.stringify(data, null, 2), function(err) {
    if(err) {
        return console.log(err);
    }
    console.log(`${fullFilename}.json was saved!`);
  });
}