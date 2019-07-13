var map;
var ajaxRequest;
var plotLayers = [];
var refreshTimer;

//var apiUrl = "{{ if eq hugo.Environment "production" }}{{ .Param "api_production" }}{{ else }}{{ .Param "api_dev" }}{{ end }}";
var apiUrl = "{{ .Param "api_url" }}";
var mapboxToken = "{{ .Param "mapbox_token" }}";

function initMap() {
  var locale = window.navigator.userLanguage || window.navigator.language;
  moment.locale(locale);

  ajaxRequest = GetXmlHttpObject();
  if (ajaxRequest == null) {
    return;
  }
  if (ajaxRequest.overrideMimeType) {
    ajaxRequest.overrideMimeType("application/json");
  }

  map = L.map('map');
  map.zoomControl.setPosition('topright');
  L.control.locate({
    position: 'topright',
    showPopup: false,
    locateOptions: {
      maxZoom: 13
    }
  }).addTo(map);

  var mapCenter = [48.709144, 44.506645];
  var mapZoom = 13;
  if (map.restoreView()) {
    mapCenter = map.getCenter();
    mapZoom = map.getZoom();
  }
  var pml = L.Permalink.getMapLocation(mapZoom, mapCenter);
  map.setView(pml.center, pml.zoom);
  L.Permalink.setup(map);

  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + mapboxToken, {
    maxZoom: 18,
    attribution: 'Air quality data &copy; <a href="https://github.com/openairtech">OpenAir</a>, ' +
      'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(map);

  updateMap();
  map.on('moveend', onMapMove);
}

function updateMap() {
  cancelRefreshTimer();
  var bounds = map.getBounds();
  var minll = bounds.getSouthWest();
  var maxll = bounds.getNorthEast();
  var url = apiUrl + '/stations?bbox=' + minll.lng + ',' + minll.lat + ',' + maxll.lng + ',' + maxll.lat;
  url += '&mlast=3h';
  ajaxRequest.onreadystatechange = stateChanged;
  ajaxRequest.open('GET', url, true);
  ajaxRequest.send(null);
}

function onMapMove(e) {
  updateMap();
}

function GetXmlHttpObject() {
  if (window.XMLHttpRequest) {
    return new XMLHttpRequest();
  }
  if (window.ActiveXObject) {
    return new ActiveXObject("Microsoft.XMLHTTP");
  }
  return null;
}

function cancelRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
}

function scheduleRefreshTimer() {
  cancelRefreshTimer();
  refreshTimer = setTimeout(updateMap, "{{ .Param "refresh_period" }}");
}

function stateChanged() {
  scheduleRefreshTimer();
  if (ajaxRequest.readyState != 4) {
    return;
  }
  if (ajaxRequest.status != 200) {
    return;
  }

  var resp = JSON.parse(ajaxRequest.responseText);
  if (!resp || !resp.stations) {
    return;
  }

  var stations = resp.stations;

  removeMarkers();

  for (i = 0; i < stations.length; i++) {
    var station = stations[i];
    var lm = station.last_measurement;

    if (lm) {
      var aqi = parseInt(lm.aqi, 10);
      var aqiColor = getMarkerColor(aqi);
      var textColor = getTextColor(aqi);

      markerOptions = {
        iconSize: [40, 40],
        iconAnchor: [20, 25],
        innerIconAnchor: [-1, 7],
        isAlphaNumericIcon: true,
        text: aqi,
        iconShape: 'marker',
        borderColor: 'lightgray',
        backgroundColor: aqiColor,
        textColor: textColor
      };
    } else {
      markerOptions = {
        iconSize: [40, 40],
        iconAnchor: [20, 25],
        innerIconAnchor: [-2, 10],
        icon: "question-circle",
        isAlphaNumericIcon: false,
        iconShape: 'marker',
        borderColor: 'darkgray',
        backgroundColor: 'lightgray',
        textColor: 'white'
      };
    }

    var ll = new L.LatLng(station.lat, station.long, true);

    var stationMarker = new L.Marker(ll, {
      icon: L.BeautifyIcon.icon(markerOptions)
    });

    stationMarker.data = station;

    map.addLayer(stationMarker);

    var popupText = "<h3>" + station.desc + "</h3>";
    if (lm) {
      popupText += "Температура: <b>" + lm.temperature + " &deg;C</b><br>";
      popupText += "Влажность: <b>" + lm.humidity + "%</b><br>";
      popupText += "Обновлено: " + moment.unix(lm.timestamp).fromNow();
    }
    stationMarker.bindPopup(popupText);

    plotLayers.push(stationMarker);
  }
}

function removeMarkers() {
  for (i = 0; i < plotLayers.length; i++) {
    map.removeLayer(plotLayers[i]);
  }
  plotLayers = [];
}

function getMarkerColor(aqi) {
  if (aqi < 51) {
    return 'green';
  } else if (aqi < 101) {
    return 'yellow';
  } else if (aqi < 151) {
    return 'orange';
  } else if (aqi < 201) {
    return 'red';
  } else if (aqi < 301) {
    return 'purple';
  }
  return "maroon";
}

function getTextColor(aqi) {
  if (aqi < 51) {
    return 'white';
  } else if (aqi < 101) {
    return 'black';
  }
  return "white";
}
