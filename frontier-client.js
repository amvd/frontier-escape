/* global XMLHttpRequest:false FlightsAnalyzer:false */
function eloquentHttpRequest (url, success, failure) {
  var request = new XMLHttpRequest()
  request.open('GET', url, true)
  request.send(null)
  request.onreadystatechange = function () {
    if (request.readyState === 4) {
      if (request.status === 200) {
        success(request.responseText)
      } else if (failure) {
        failure(request.status, request.statusText)
      }
    }
  }
}

function analyzeFlights (responseStr) {
  const data = eval(responseStr)

  const analyzer = new FlightsAnalyzer(data)

  console.log('Roundtrips for Chicago:', analyzer.matchDeals('Chicago Ohare (ORD)'))
}

eloquentHttpRequest(
  'http://f9cdn.azureedge.net/static/SalesDataV2.js?true=returnJson&true=returnJson',
  analyzeFlights,
  function () {
    console.error('Request Failed.')
  }
)
