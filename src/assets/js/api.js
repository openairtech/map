function initApi() {
  // Do nothing for now
}

function apiXmlHttpObject() {
  if (window.XMLHttpRequest) {
    return new XMLHttpRequest();
  }
  if (window.ActiveXObject) {
    return new ActiveXObject("Microsoft.XMLHTTP");
  }
  return null;
}

function apiRequest() {
  var ajaxRequest = apiXmlHttpObject();
  if (ajaxRequest == null) {
    return null;
  }
  if (ajaxRequest.overrideMimeType) {
    ajaxRequest.overrideMimeType("application/json");
  }
  return ajaxRequest;
}

function apiGet(request, onSuccess, onError) {
  var ajaxRequest = apiRequest();
  ajaxRequest.onreadystatechange = function() {
    if (ajaxRequest.readyState != 4) {
      return;
    }
    if (ajaxRequest.status != 200) {
      onError(ajaxRequest.status);
    }
    onSuccess(ajaxRequest.responseText);
  };
  ajaxRequest.open('GET', "{{ .Param "api_url" }}" + request, true);
  ajaxRequest.send(null);
}

function apiGetStations(onSuccess, onError, bounds, time, all) {
  var minll = bounds.getSouthWest();
  var maxll = bounds.getNorthEast();
  var request = '/stations?bbox=' + minll.lng + ',' + minll.lat +
    ',' + maxll.lng + ',' + maxll.lat;
  if (time) {
    request += '&mfrom=' + time;
  }  
  request += '&mlast=3h';
  if (all) {
    request += '&sall=true';
  }
  apiGet(request, onSuccess, onError);
}

function apiGetMeasurements(onSuccess, onError, stationId, timeFrom, timeTo, vars) {
  var request = '/measurements?station=' + stationId;
  request += '&from=' + timeFrom;
  request += '&to=' + timeTo;
  if (vars) {
    request += '&v=' + vars.join();
  }
  apiGet(request, onSuccess, onError);
}
