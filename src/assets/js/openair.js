var map;
var ajaxRequest;
var plotLayers = [];

var timers = {};

const TIMELINE_STEP = 10 * 60; // in seconds
const TIMELINE_LENGTH = 24 * 60 * 60 - TIMELINE_STEP; // in seconds

var mapDate = null;
var mapTime = null;
var sliderEndTime = null;

var shouldUpdatePermalink = true;

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

  var pml = getPermalinkData(mapZoom, mapCenter, 0);
  setupPermalink(map);

  initTimeController();

  setMapTime(pml.time);
  map.setView(pml.center, pml.zoom);

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

function getPermalinkData(zoom, center, time) {
  if (window.location.hash !== '') {
    var hash = window.location.hash.replace('#', '');
    var parts = hash.split(',');
    if (parts.length >= 3) {
      center = {
        lat: parseFloat(parts[0]),
        lng: parseFloat(parts[1])
      };
      zoom = parseInt(parts[2].slice(0, -1), 10);
      if (parts.length >= 4) {
        time = parseInt(parts[3].slice(0, -1), 10);
      }
    }
  }
  return {
    zoom: zoom,
    center: center,
    time: time
  };
}

function updatePermalink() {
  if (!shouldUpdatePermalink) {
    // Do not update the URL when the view was changed in the 'popstate'
    // handler (browser history navigation)
    shouldUpdatePermalink = true;
    return;
  }
  var center = map.getCenter();
  var hash = '#' +
    Math.round(center.lat * 100000) / 100000 + ',' +
    Math.round(center.lng * 100000) / 100000 + ',' +
    map.getZoom() + 'z';
  if (mapTime) {
    hash += ',' + mapTime + 't';
  }
  var state = {
    zoom: map.getZoom(),
    center: center,
    time: mapTime
  };
  window.history.pushState(state, 'map', hash);
};

function setupPermalink(map) {
  // Restore the view state when navigating through the history, see
  // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
  window.addEventListener('popstate', function(event) {
    if (event.state === null) {
      return;
    }
    setMapTime(event.state.time);
    map.setView(event.state.center, event.state.zoom);
    shouldUpdatePermalink = false;
  });
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
  datepicker.on('changeDate', function(e) {
    timeDatepickerChanged(e);
  });

  $("#time-fast-forward").click(function(event) {
    $('#time-datepicker').datepicker('setDate', '');
    scheduleTimer('time_ff_blur', function () {
      $("#time-fast-forward").blur();
    }, 0);
    event.preventDefault();
  });
  $("#time-step-forward").click(function(event) {
    var slider = $('#time-slider');
    var val = slider.slider('value');
    var min = slider.slider('option', 'min');
    var max = slider.slider('option', 'max');
    var step = slider.slider('option', 'step');
    var nextVal = val + step;
    if (nextVal <= max) {
      slider.slider('value', nextVal);
    } else if (mapDate) {
      // Jump to the next day
      mapDate.add(1, 'day');
      if (mapDate.isBefore(new Date(), "day")) {
        // Next day is not today
        slider.slider('value', min);
      } else {
        // Next day is today
        sliderEndTime = getRoundedTimeNow();
        nextVal = max - moment(sliderEndTime)
          .subtract(mapDate.unix(), 'seconds').unix();
        mapDate = null; // today
        slider.slider('value', nextVal);
      }
    } else {
        slider.slider('value', max);
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
    var max = slider.slider('option', 'max');
    var step = slider.slider('option', 'step');
    var nextVal = val - step;
    if (nextVal >= min) {
      slider.slider('value', nextVal);
    } else if (mapDate) {
      // Jump to the day before which is not yesterday
      mapDate.subtract(1, 'day');
      slider.slider('value', max);
    } else {
      // Jump to yesterday
      mapDate = moment(sliderEndTime).subtract(1, 'day').startOf('day');
      nextVal = min + moment(sliderEndTime)
        .subtract(1, 'day')
        .subtract(mapDate.unix(), 'seconds').unix();
      slider.slider('value', nextVal);
    }
    scheduleTimer('time_sb_blur', function () {
      $("#time-step-backward").blur();
    }, 0);
    event.preventDefault();
  });

  $('#time-date-dropup').on('show.bs.dropdown', function () {
    timeDatepickerShow();
  })
}

function timeDatepickerShow() {
  var datepicker = $('#time-datepicker');
  if (mapDate) {
    datepicker.datepicker('update', new Date(mapDate));
  } else {
    datepicker.datepicker('update', new Date());
  }
}

function timeDatepickerChanged(e) {
  var date = $('#time-datepicker').datepicker('getDate');
  if (!date || !moment(date).isBefore(new Date(), "day")) {
    // Today's day is selected
    mapDate = null;
    $('#time-slider').slider('value', 0); // slide slider to now
  } else {
    // Selected day is in the past (yesterday or earlier)
    mapDate = moment(date);
    var slider = $('#time-slider');
    var min = slider.slider('option', 'min');
    slider.slider('value', min); // slide slider to start of the day
  }
  if (e.date) {
    $('#time-date-dropup').trigger('click'); // hide datepicker
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
    // Rewind time to now
    mapTime = null; // now
    sliderEndTime = null; // now
    var sliderTooltip = "Сейчас";
    scheduleTimer('tooltip_hide', function () {
      $(ui.handle).tooltip('hide');
    }, 1000);
  } else {
    cancelRefreshTimer();
    cancelTimer('tooltip_hide');
    if (mapDate) {
      // Browsing past day (yesterday or earlier)
      // Set slider end time to the end of that day
      sliderEndTime = moment(mapDate).add(TIMELINE_LENGTH, 'seconds');
    } else if (!sliderEndTime) {
      // Browsing today's day
      // Set slider end time to the now time rounded to step
      sliderEndTime = getRoundedTimeNow();
    }
    var sliderTime = moment(sliderEndTime).add(ui.value, 'seconds');
    var sliderTooltip = sliderTime.format('lll');
    mapTime = sliderTime.unix();
  }
  // Update tooltip
  scheduleTimer('tooltip_update', function () {
    $(ui.handle).attr('title', sliderTooltip).tooltip('_fixTitle').tooltip('show');
  }, 0);
  // Schedule map update according to updated time
  scheduleTimer('update_map', updateMap, 250);
}

function getRoundedTimeNow() {
  return moment.unix(Math.ceil(moment().unix() / TIMELINE_STEP) * TIMELINE_STEP);
}

function setMapTime(unixTime) {
  // Default values for map time 'now'
  var sliderMax = $('#time-slider').slider('option', 'max');
  var sliderValue = sliderMax;
  mapDate = null;
  mapTime = null;
  sliderEndTime = null;
  if (unixTime) {
    // Set map time and date according to given unix time
    mapTime = unixTime;
    // Calculate corresponding map date
    var t = moment.unix(unixTime);
    if (t.isBefore(moment().subtract(1, 'day'))) {
      // Set past day time (yesterday or earlier)
      var d = moment(t).startOf('day');
      mapDate = d;
      // Set slider end time to the end of that day
      sliderEndTime = moment(d).add(TIMELINE_LENGTH, 'seconds');
    } else {
      // Set slider end time to the now time rounded to step
      sliderEndTime = getRoundedTimeNow();
    }
    // Calculate slide value
    sliderValue = sliderMax - sliderEndTime.diff(t, 'seconds');
  }
  // Set slider value and update map
  $('#time-slider').slider('value', sliderValue);
}

function updateMap() {
  cancelRefreshTimer();
  updatePermalink();
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
  scheduleTimer('update_map', updateMap, 0);
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
      popupText += "Частицы PM2.5: <b>" + lm.pm25.toFixed(1) + " мкг/м&sup3;</b><br>";
      popupText += "Частицы PM10: <b>" + lm.pm10.toFixed(1) + " мкг/м&sup3;</b><hr>";
      popupText += "Температура: <b>" + lm.temperature + " &deg;C</b><br>";
      popupText += "Влажность: <b>" + lm.humidity + "%</b><br>";
      if (mapTime) {
        popupText += "Время: " + moment.unix(lm.timestamp).format('lll');
      } else {
        popupText += "Обновлено: " + moment.unix(lm.timestamp).fromNow();
      }
    } else {
      popupText += "Нет данных";
      if (station.seen) {
        var stationSeen = moment.unix(station.seen);
        if (!mapTime || moment.unix(mapTime).isAfter(stationSeen)) {
          popupText += " с " + stationSeen.format('lll');
        }
      }
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
