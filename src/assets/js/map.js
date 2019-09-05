var map;
var mapStationMarkers = [];

const mapboxToken = "{{ .Param "mapbox_token" }}";

function initMap() {
  map = L.map('map');
  map.zoomControl.setPosition('topright');
  L.control.locate({
    position: 'topright',
    showPopup: false,
    locateOptions: {
      maxZoom: 13
    }
  }).addTo(map);

  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + mapboxToken, {
    maxZoom: 18,
    attribution: 'Sensor data &copy; <a href="https://github.com/openairtech">OpenAir</a>, ' +
      'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(map);

  map.on('moveend', onMapMove);
}

function onMapMove(e) {
  scheduleMapUpdateTimer(0);
}

function cancelMapUpdateTimer() {
  cancelTimer('update_map');
}

function scheduleMapUpdateTimer(delay) {
  cancelMapUpdateTimer();
  scheduleTimer('update_map', updateMap, delay);
}

function scheduleMapPeriodicUpdateTimer() {
  scheduleMapUpdateTimer("{{ .Param "map_refresh_period" }}");
}

function updateMap() {
  cancelMapUpdateTimer();
  updatePermalink();
  var bounds = map.getBounds();
  var minll = bounds.getSouthWest();
  var maxll = bounds.getNorthEast();
  var request = '/stations?bbox=' + minll.lng + ',' + minll.lat +
    ',' + maxll.lng + ',' + maxll.lat;
  if (timelineTime) {
    request += '&mfrom=' + timelineTime;
  }
  request += '&mlast=3h';
  apiGet(request, mapStationsResponseHandler, mapStationsErrorHandler)
}

function mapStationsErrorHandler(errorCode) {
  // Schedule periodic map update only in realtime (non-history) mode
    if (!timelineTime) {
      scheduleMapPeriodicUpdateTimer();
    }
}

function mapStationsResponseHandler(responseText) {
  // Schedule periodic map update only in realtime (non-history) mode
  if (!timelineTime) {
    scheduleMapPeriodicUpdateTimer();
  }

  var resp = JSON.parse(responseText);
  if (!resp || !resp.stations) {
    return;
  }

  redrawMapStationMarkers(resp.stations);
}

function redrawMapStationMarkers(stations) {
  removeMapStationMarkers();

  for (i = 0; i < stations.length; i++) {
    var station = stations[i];
    var lm = station.last_measurement;

    if (lm) {
      var aqi = parseInt(lm.aqi, 10);
      var aqiColor = getMapStationMarkerColor(aqi);
      var textColor = getMapStationMarkerTextColor(aqi);

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

    var popupText = "<h6>" + station.desc + "</h6>";
    if (lm) {
      popupText += "Частицы PM2.5: <b>" + lm.pm25.toFixed(1) + " мкг/м&sup3;</b><br>";
      popupText += "Частицы PM10: <b>" + lm.pm10.toFixed(1) + " мкг/м&sup3;</b><hr>";
      popupText += "Температура: <b>" + lm.temperature + " &deg;C</b><br>";
      popupText += "Влажность: <b>" + lm.humidity + "%</b><br>";
      if (timelineTime) {
        popupText += "Время: " + moment.unix(lm.timestamp).format('lll');
      } else {
        popupText += "Обновлено: " + moment.unix(lm.timestamp).fromNow();
      }
    } else {
      popupText += "Нет данных";
      if (station.seen) {
        var stationSeen = moment.unix(station.seen);
        if (!timelineTime || moment.unix(timelineTime).isAfter(stationSeen)) {
          popupText += " с " + stationSeen.format('lll');
        }
      }
    }
    stationMarker.bindPopup(popupText);

    mapStationMarkers.push(stationMarker);
  }
}

function removeMapStationMarkers() {
  for (i = 0; i < mapStationMarkers.length; i++) {
    map.removeLayer(mapStationMarkers[i]);
  }
  mapStationMarkers = [];
}

function getMapStationMarkerColor(aqi) {
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

function getMapStationMarkerTextColor(aqi) {
  if (aqi < 51) {
    return 'white';
  }
  return "black";
}
