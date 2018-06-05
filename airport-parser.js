'use-strict';

const csv = require('csv');
const fs = require('fs');
const Promise = require('bluebird');

const readFile = Promise.promisify(fs.readFile);
const writeFile = Promise.promisify(fs.writeFile);
const parseCSV = Promise.promisify(csv.parse);

const airportsFile = 'airports.dat';

const COLUMNS_TO_INCLUDE = ['id', 'name', 'iata', 'city', 'latitude', 'longitude'];

readFile(airportsFile, 'utf8').then((contents) => {
  return parseCSV(contents, {auto_parse: true});
}).then((records) => {
  // Sample line:
  // 1,"Goroka Airport","Goroka","Papua New Guinea","GKA","AYGA",-6.081689834590001,145.391998291,5282,10,"U","Pacific/Port_Moresby","airport","OurAirports"
  const columnNames = ['id', 'name', 'city', 'country', 'iata', 'icao', 'latitude', 'longitude', 'altitude', 'timezoneOffset', 'dst', 'tzTimezone', 'type', 'source'];

  const resultsMap = {};

  const L = records.length;
  let i = 0;
  while (i < L) {
    const newAirport = mapColumnsToValues(columnNames, records[i]);
    resultsMap[newAirport.iata] = newAirport;
    i++;
  }
  writeToFile(resultsMap);
});

function mapColumnsToValues (columnList, valueList) {
  if (columnList.length !== valueList.length) {
    throw new Error('Column name and value lists do not match.');
  }
  const resultHash = {};
  const L = columnList.length;
  let i = 0;
  while (i < L) {
    const columnName = columnList[i];
    if (COLUMNS_TO_INCLUDE.indexOf(columnName) > -1) {
      resultHash[columnName] = valueList[i];
    }

    i++;
  }
  return resultHash;
}

function writeToFile (data, directory = './airports') {
  if (directory !== '.' && !fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }
  const fullFilename = `${directory}/airports.json`;
  fs.writeFile(fullFilename, JSON.stringify(data, null, 2), function (err) {
    if (err) {
      return console.log(err);
    }
    console.log(`${fullFilename} was saved!`);
  });
}
