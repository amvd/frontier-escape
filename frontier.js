var http = require('http');
var fs = require('fs');

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

    fs.writeFile("frontier2.txt", JSON.stringify(data), function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    }); 
    console.log(data)

    // displayDeals(data);

    let deals = extractDeals(data);

    if(process.argv[2] && process.argv[3]) {
      console.log(matchCities(deals, process.argv[2], process.argv[3]));
    } else if(process.argv[2]) {
      console.log(matchDeals(deals, process.argv[2]))
    } else {
      console.log(extractOrigins(data));
      // displayDeals(data);
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
    let origin = data[i].fromCity;
    
    if (cities.indexOf(origin) === -1) {
      cities.push(origin)
    }
  }

  return cities.sort();
}

function displayDeals(data) {
  for(let i = 0, L = data.length; i < L; i++) {
    let group = data[i];

    console.log("City: ", group.fromCity);
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

    console.log("City: ", group.fromCity);
    airports.push(group.fromCity);

    group.deals.forEach((deal)=>{
      resultArray.push(deal);
    });
  }
  return resultArray;
}

function matchDeals(deals, origin) {
  let allMatches = [];
  let searchDeals = deals;

  if(origin) {
    searchDeals = deals.filter((deal)=>{return deal.fromCity == origin})
  }

  searchDeals.forEach((deal) => {
    let matches = deals.filter((d)=>{
      return deal.fromCity == d.toCity && deal.toCity == d.fromCity &&
        ((deal.flyStartDate <= d.flyEndDate && deal.flyEndDate >= d.flyStartDate) || (d.flyStartDate <= deal.flyEndDate && d.flyEndDate >= deal.flyStartDate))
    })

    if(matches.length > 0) {
      console.log("Coming from:", deal.fromCity)

      matches.forEach((match)=>{
        // console.log("You can fly to and from " + match.fromCity + " for $" + (deal.price + match.price));

        allMatches.push({
          origin: deal.fromCity,
          destination: match.fromCity,
          price: deal.price + match.price,
          departRange: `${deal.flyStartDate} - ${deal.flyEndDate}`,
          returnRange: `${match.flyStartDate} - ${match.flyEndDate}`,
          departDetails: deal.captionText,
          returnDetails: match.captionText
        })
      })
    }
  });

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