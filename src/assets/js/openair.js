var map;
var ajaxRequest;
var plotLayers = [];

var timers = {};

const TIMELINE_STEP = 10 * 60; // in seconds
const TIMELINE_LENGTH = 24 * 60 * 60 - TIMELINE_STEP; // in seconds

var mapDate = null;
var mapTime = null;

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
    attribution: 'Sensor data &copy; <a href="https://github.com/openairtech">OpenAir</a>, ' +
      'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(map);

  initTimeController();

  updateMap();
  map.on('moveend', onMapMove);
}

function initTimeController() {
  $('#time-slider').slider({
    min: -TIMELINE_LENGTH,
    max: 0,
    step: TIMELINE_STEP,
    value: 0,
    slide: function(event, ui) {
      timeSliderChanged(event, ui);
    },
    change: function(event, ui) {
      timeSliderChanged(event, ui);
    },
    create: function (event, ui) {
      timeSliderCreated(event, ui);
    }
  });

  var datepicker = $('#time-datepicker');
  datepicker.datepicker({
    endDate: '+0d',
    todayHighlight: true,
    language: 'ru'
  });
  datepicker.datepicker('setDate', new Date());
  datepicker.on('changeDate', function(e) {
    timeDatepickerChanged(e);
  });

  $("#time-fast-forward").click(function(event) {
    $('#time-datepicker').datepicker('setDate', new Date());
    scheduleTimer('time_ff_blur', function () {
      $("#time-fast-forward").blur();
    }, 0);
    event.preventDefault();
  });
  $("#time-step-forward").click(function(event) {
    var slider = $('#time-slider');
    var val = slider.slider('value');
    var max = slider.slider('option', 'max');
    var step = slider.slider('option', 'step');
    var nextVal = val + step;
    if (nextVal <= max) {
      slider.slider('value', nextVal);
    }
    scheduleTimer('time_sf_blur', function () {
      $("#time-step-forward").blur();
    }, 0);
    event.preventDefault();
  });
  $("#time-step-backward").click(function(event) {
    var slider = $('#time-slider');
    var val = slider.slider('value');
    var min = slider.slider('option', 'min');
    var step = slider.slider('option', 'step');
    var nextVal = val - step;
    if (nextVal >= min) {
      slider.slider('value', nextVal);
    }
    scheduleTimer('time_sb_blur', function () {
      $("#time-step-backward").blur();
    }, 0);
    event.preventDefault();
  });
}

function timeDatepickerChanged(e) {
  var date = $('#time-datepicker').datepicker('getDate');
  if (!date || !moment(date).isBefore(new Date(), "day")) {
    // Today's date is selected
    mapDate = null;
    $('#time-slider').slider('value', 0); // slide slider to now
  } else {
    // Selected date is in the past
    mapDate = date;
    var slider = $('#time-slider');
    var min = slider.slider('option', 'min');
    slider.slider('value', min); // slide slider to start of day
  }
  if (e.date) {
    $('#time-date-icon').trigger('click'); // hide datepicker
  }
}

function timeSliderCreated(event, ui) {
    var handles = $(event.target).find('span');
    handles.eq(0).tooltip({
        animation: false,
        placement: 'top',
        trigger: 'manual',
        container: handles.eq(0),
        title: ''
    });
}

function timeSliderChanged(event, ui) {
  if (!mapDate && ui.value == 0) {
    // Set time to now
    mapTime = null;
    var sliderTooltip = "Сейчас";
    scheduleTimer('tooltip_hide', function () {
      $(ui.handle).tooltip('hide');
    }, 1000);
  } else {
    cancelRefreshTimer();
    cancelTimer('tooltip_hide');
    if (mapDate) {
      // Calc slider end time as end of picked date
      var sliderEndTime = moment(mapDate).add(TIMELINE_LENGTH, 'seconds').unix();
    } else {
      // Calc slider end time from current time rounded to tens in minutes
      var sliderEndTime = Math.ceil(moment().unix() / TIMELINE_STEP) * TIMELINE_STEP;
    }
    var sliderTime = moment.unix(sliderEndTime).add(ui.value, 'seconds');
    var sliderTooltip = sliderTime.format('lll');
    mapTime = sliderTime.unix();
  }
  // Update tooltip
  scheduleTimer('tooltip_update', function () {
    $(ui.handle).attr('title', sliderTooltip).tooltip('_fixTitle').tooltip('show');
  }, 0);
  // Schedule map update according to updated time
  scheduleTimer('time_updated', updateMap, 250);
}

function updateMap() {
  cancelRefreshTimer();
  var bounds = map.getBounds();
  var minll = bounds.getSouthWest();
  var maxll = bounds.getNorthEast();
  var url = apiUrl + '/stations?bbox=' + minll.lng + ',' + minll.lat + ',' + maxll.lng + ',' + maxll.lat;
  if (mapTime) {
    url += '&mfrom=' + mapTime;
  }
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
  cancelTimer('refresh');
}

function scheduleRefreshTimer() {
  cancelRefreshTimer();
  scheduleTimer('refresh', updateMap, "{{ .Param "refresh_period" }}");
}

function cancelTimer(timer) {
  clearTimeout(timers[timer]);
}

function scheduleTimer(timer, fn, timeout) {
  cancelTimer(timer);
  timers[timer] = setTimeout(fn, timeout);
}

function stateChanged() {
  if (!mapTime) {
    scheduleRefreshTimer();
  }

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

    var popupText = "<h6>" + station.desc + "</h6>";
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
  }
  return "black";
}
