var map;
var mapStationMarkers = {};

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
  map.on('popupopen',onMapPopupOpen);
}

function onMapMove(e) {
  scheduleMapUpdateTimer(0);
}

function onMapPopupOpen(e) {
  var stationMarker = e.popup._source;
  updateMapStationMarkerPopup(stationMarker);
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

function cancelMapStationMarkerPopupsUpdateTimer() {
  cancelTimer('update_map_marker_popups');
}

function scheduleMapStationMarkerPopupsUpdateTimer() {
  scheduleTimer('update_map_marker_popups', updateMapStationMarkerPopups, 10000);
}

function updateMap() {
  cancelMapUpdateTimer();
  updatePermalink();
  apiGetStations(mapStationsResponseHandler, mapStationsErrorHandler,
    map.getBounds(), timelineTime);
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

  cancelMapStationMarkerPopupsUpdateTimer();

  redrawMapStationMarkers(resp.stations);

  // Schedule map marker popups update only in realtime (non-history) mode
  if (!timelineTime) {
    scheduleMapStationMarkerPopupsUpdateTimer();
  }
}

function redrawMapStationMarkers(stations) {
  removeStaleMapStationMarkers(stations);

  for (i = 0; i < stations.length; i++) {
    var station = stations[i];

    var lm = station.last_measurement;

    if (lm) {
      var aqi = parseInt(lm.aqi, 10);
      var aqiColor = getMapStationMarkerColor(aqi);
      var textColor = getMapStationMarkerTextColor(aqi);

      markerIconOptions = {
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
      markerIconOptions = {
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

    var stationIcon = L.BeautifyIcon.icon(markerIconOptions);

    var stationMarker = mapStationMarkers[station.id];
    if (!stationMarker) {
      // Add new marker
      var ll = new L.LatLng(station.lat, station.long, true);
      stationMarker = new L.Marker(ll, {
        icon: stationIcon
      });
      mapStationMarkers[station.id] = stationMarker;
      map.addLayer(stationMarker);
      var popupContent = getMapStationMarkerPopupContent(station);
      stationMarker.bindPopup(popupContent);
    } else {
      // Update existing marker
      stationMarker.setIcon(stationIcon);
    }
    stationMarker.station = station;
    updateMapStationMarkerPopup(stationMarker);
  }
}

// Remove map markers not present in stations array
function removeStaleMapStationMarkers(stations) {
  mapStationsLoop:
  for (var mapStationId in mapStationMarkers) {
    for (var i = 0; i < stations.length; i++) {
      var station = stations[i];
      if (station.id == mapStationId) { // FIXME check for station position is updated
        // FIXME no need for more checks for already matched station.id
        continue mapStationsLoop;
      }
    }
    // Map marker for this mapStationId not present in stations array.
    // Remove it from the map
    map.removeLayer(mapStationMarkers[mapStationId]);
    delete mapStationMarkers[mapStationId];
  }
}

function updateMapStationMarkerPopups() {
  for (var mapStationId in mapStationMarkers) {
    var stationMarker = mapStationMarkers[mapStationId];
    updateMapStationMarkerPopup(stationMarker);
  }
  // Schedule map marker popups update only in realtime (non-history) mode
  if (!timelineTime) {
    scheduleMapStationMarkerPopupsUpdateTimer();
  }
}

function updateMapStationMarkerPopup(stationMarker) {
  var station = stationMarker.station;
  var lm = station.last_measurement;
  if (!lm) {
    return;
  }
  var popup = stationMarker.getPopup();
  if (!popup || !popup.isOpen()) {
    return;
  }
  // Update popup data
  var e = popup.getContent().querySelector('[name="stationPopupSensorData"]');
  if (e) {
    e.innerHTML = getMapStationMarkerPopupSensorDataContent(station).outerHTML;
  }

  updateMapStationMarkerPopupAqiChart(stationMarker);
}

function updateMapStationMarkerPopupAqiChart(stationMarker) {
  var aqiChartHours = {{ .Param "map_charts_time_window" }};
  var station = stationMarker.station;
  var onSuccess = function(responseText) {
    var resp = JSON.parse(responseText);
    if (resp && resp.measurements) {
      drawMapStationMarkerPopupAqiChart(stationMarker, resp.measurements, aqiChartHours);
    }
  };
  var onError = function(errorStatus) {
    console.log("apiGetMeasurements error: " + errorStatus);
  };
  var timeTo = timelineTime ? timelineTime : moment().unix();
  var timeFrom = moment.unix(timeTo).subtract(aqiChartHours, 'hour').unix();
  apiGetMeasurements(onSuccess, onError, station.id, timeFrom, timeTo, ["aqi"]);
}

function drawMapStationMarkerPopupAqiChart(stationMarker, measurements, timeHours) {
  var timeEnd = timelineTime ? moment.unix(timelineTime) : moment();
  var timeRanges = [];
  for (var h = timeHours - 1; h >= 0; h--) {
    timeRanges.push(moment(timeEnd).subtract(h, 'hour').startOf('hour'));
  }

  var aqiValues = aggregateMapStationMeasurements(measurements, timeRanges);

  var aqiColors = [];
  for (var i = 0; i < aqiValues.length; i++) {
    var aqi = aqiValues[i];
    aqiColors.push(getMapStationMarkerColor(aqi));
  }

  var aqiChart = getMapStationMarkerPopupAqiChart(stationMarker);
  aqiChart.data.labels = timeRanges;
  if (!aqiChart.data.datasets || aqiChart.data.datasets.length == 0) {
    aqiChart.data.datasets = [{
      label: 'AQI',
      data: aqiValues,
      backgroundColor: aqiColors,
      borderWidth: 1
    }];
  } else {
    aqiChart.data.datasets[0].data = aqiValues;
    aqiChart.data.datasets[0].backgroundColor = aqiColors;
  }
  aqiChart.update();
}

// Aggregate station measurements to given time ranges
function aggregateMapStationMeasurements(measurements, timeRanges) {
  // Create empty time range values array
  var aqiValues = [];
  for (var i = 0; i < timeRanges.length; i++) {
    aqiValues.push(null);
  }

  // Check all measurement timestamps
  for (var i = 0; i < measurements.length; i++) {
    var m = measurements[i];
    var aqiValue = m.aqi;
    var aqiTimestamp = moment.unix(m.timestamp);
    // Find time range this measurement is belong to
    for (var j = timeRanges.length-1; j >= 0; j--) {
      if (timeRanges[j].isSameOrBefore(aqiTimestamp)) {
        // Update time range value if this is the first value or max value
        if (!aqiValues[j] || aqiValues[j] < aqiValue) {
          aqiValues[j] = aqiValue;
        }
        break;
      }
    }
  }

  return aqiValues;
}

function getMapStationMarkerPopupAqiChart(stationMarker) {
  var aqiChart = stationMarker.aqiChart;

  if (!aqiChart) {
    var popup = stationMarker.getPopup();
    var canvas = popup.getContent().querySelector('[name="stationPopupAqiChart"]');
    var ctx = canvas.getContext('2d');
    var aqiChart = new Chart(ctx, {
      type: 'bar',
      options: {
        legend: {
          display: false
        },
        title: {
          display: true,
          fontSize: 10,
          padding: 2,
          text: 'AQI'
        },
        scales: {
          xAxes: [{
            type: 'time',
            time: {
              unit: 'hour',
              unitStepSize: 1,
              displayFormats: {
                'hour': 'HH',
              },
              tooltipFormat: 'lll'
            },
            gridLines: {
                offsetGridLines: true
            }
          }],
          yAxes: [{
            ticks: {
              beginAtZero: true
            }
          }]
        }
      }
    });
    stationMarker.aqiChart = aqiChart;
  }

  return aqiChart;
}

function getMapStationMarkerPopupContent(station) {
  // Station name
  var html = '<div class="row no-gutters">';
  html += '<div class="col-12">';
  html += '<h6>' + station.desc + '</h6>';
  html += '</div>';
  html += '</div>';

  // AQI chart
  html += '<div class="row no-gutters">';
  html += '<div class="col-12">';
  html += '<canvas name="stationPopupAqiChart" width="250" height="100"></canvas>';
  html += '</div>';
  html += '</div>';

  // Sensor data
  html += '<div class="row no-gutters">';
  html += '<div name="stationPopupSensorData" class="col-12">';
  html += '</div>';
  html += '</div>';

  var content = L.DomUtil.create('div', 'container-fluid p-0');
  content.innerHTML = html;

  return content;
}

function getMapStationMarkerPopupSensorDataContent(station) {
  var html;

  var lm = station.last_measurement;
  if (lm) {
    // PM2.5
    html = '<div class="row no-gutters">';

    html += '<div class="col-6">';
    html += "Частицы PM2.5:";
    html += '</div>';

    html += '<div class="col-6">';
    html += '<b>' + lm.pm25.toFixed(1) + ' мкг/м&sup3;</b><br>';
    html += '</div>';

    html += '</div>';

    // PM10
    html += '<div class="row no-gutters">';

    html += '<div class="col-6">';
    html += "Частицы PM10:";
    html += '</div>';

    html += '<div class="col-6">';
    html += '<b>' + lm.pm10.toFixed(1) + ' мкг/м&sup3;</b>';
    html += '</div>';

    html += '</div>';

    // Temperature
    html += '<div class="row no-gutters mt-1">';

    html += '<div class="col-6">';
    html += "Температура:";
    html += '</div>';

    html += '<div class="col-6">';
    html += '<b>' + lm.temperature.toFixed(1) + ' &deg;C</b>';
    html += '</div>';

    html += '</div>';

    // Humidity
    html += '<div class="row no-gutters">';

    html += '<div class="col-6">';
    html += "Влажность:";
    html += '</div>';

    html += '<div class="col-6">';
    html += '<b>' + Math.round(lm.humidity) + '%</b>';
    html += '</div>';

    html += '</div>';

    // Timestamp
    html += '<div class="row no-gutters mt-1">';
    html += '<div class="col-12">';
    if (timelineTime) {
      html += 'Время: ' + moment.unix(lm.timestamp).format('lll');
    } else {
      html += 'Обновлено: ' + moment.unix(lm.timestamp).fromNow();
    }
    html += '</div>';

    html += '</div>';
  } else {
    html = '<div class="row">';
    html += '<div class="col-12">';
    html += "Нет данных";
    if (station.seen) {
      var stationSeen = moment.unix(station.seen);
      if (!timelineTime || moment.unix(timelineTime).isAfter(stationSeen)) {
        html += " с " + stationSeen.format('lll');
      }
    }
    html += '</div>';
  }

  var content = L.DomUtil.create('div', 'container-fluid p-0');
  content.innerHTML = html;

  return content;
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
