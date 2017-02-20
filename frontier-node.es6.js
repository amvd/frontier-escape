'use-strict';

var http = require('http');
var fs = require('fs');
var FlightsAnalyzer = require('./frontier_module.es6');

var options = {
  host: 'f9cdn.azureedge.net',
  path: '/static/SalesDataV2.js?true=returnJson&true=returnJson'
};

const callback = function (response) {
  let str = '';

  response.on('data', function (chunk) {
    str += chunk;
  });

  // the whole response has been recieved, so we just print it out here
  response.on('end', function () {
    const data = processResponseStr(str);
    const analyzer = new FlightsAnalyzer(data);

    writeToFile(`frontier_raw`, data, 'raw_json');
    writeToFile(`extracted_deals`, analyzer.deals, 'deals_list');

    const citiesList = analyzer.citiesList;

    writeToFile('cities_list', citiesList, 'cities');

    mapCitiesToCoordinates(citiesList);

    if (process.argv[2] && process.argv[3]) {
      const matches = analyzer.matchCities(extractIATACode(process.argv[2]), extractIATACode(process.argv[3]));
      writeToFile(`city1_${process.argv[2].replace(/ /g, '_')}_city2_${process.argv[3].replace(/ /g, '_')}`, matches, 'union_results');
      console.log(matches);
    } else if (process.argv[2]) {
      const matches = analyzer.matchDeals(extractIATACode(process.argv[2]));
      writeToFile(`from_${process.argv[2].replace(/ /g, '_')}`, matches, 'search_results');
      console.log(matches);
    } else {
      // console.log(extractOrigins(data));
      // displayDeals(data);
      const dealMap = analyzer.dealMap;
      writeToFile(`dealmap`, dealMap, 'dealmaps');
      // console.log(dealMap)
    }
  });
};

http.request(options, callback).end();

function processResponseStr (str) {
  str = str.slice(11, -2);
  return JSON.parse(str);
}

function writeToFile (filename, data, directory = '.') {
  if (directory !== '.' && !fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }
  const fullFilename = `${Date.now()}_${filename}`;
  fs.writeFile(`${directory}/${fullFilename}.json`, JSON.stringify(data, null, 2), function (err) {
    if (err) {
      return console.log(err);
    }
    console.log(`${fullFilename}.json was saved!`);
  });
}

function mapCitiesToCoordinates (citiesList) {
  const airports = require('./airports/airports.json');

  const citiesMap = {};

  for (let i = 0, L = citiesList.length; i < L; i++) {
    const code = citiesList[i];
    const airport = airports[code];
    const {name, iata, city, latitude, longitude} = airport;
    citiesMap[code] = {name, iata, city, latitude, longitude};
  }

  writeToFile('relevant_airports', citiesMap, 'airports');

  return citiesMap;
}

function extractIATACode (airportName) {
  return airportName.match(/\((...)\)/)[1];
}
