var shouldUpdatePermalink = true;

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

function getPermalinkHash() {
  var center = map.getCenter();
  var hash = '#' +
    Math.round(center.lat * 100000) / 100000 + ',' +
    Math.round(center.lng * 100000) / 100000 + ',' +
    map.getZoom() + 'z';
  if (timelineTime) {
    hash += ',' + timelineTime + 't';
  }
  return hash;
}

function updatePermalink() {
  if (!shouldUpdatePermalink) {
    // Do not update the URL when the view was changed in the 'popstate'
    // handler (browser history navigation)
    shouldUpdatePermalink = true;
    return;
  }
  var center = map.getCenter();
  var hash = getPermalinkHash();
  var state = {
    zoom: map.getZoom(),
    center: center,
    time: timelineTime
  };
  window.history.pushState(state, 'map', hash);
};

function copyPermlalinkToClipboard() {
  // Based on https://stackoverflow.com/questions/40958613/how-to-copy-url-on-button-click
  // and https://stackoverflow.com/questions/14780350/convert-relative-path-to-absolute-using-javascript
  var inp = $("<input>");
  $("body").append(inp);
  var link = document.createElement("a");
  link.href = getPermalinkHash();
  inp.val(link.href).select();
  document.execCommand("copy");
  inp.remove();
}

function setupPermalink(map) {
  // Restore the view state when navigating through the history, see
  // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
  window.addEventListener('popstate', function(event) {
    if (event.state === null) {
      return;
    }
    setTimelineTime(event.state.time);
    map.setView(event.state.center, event.state.zoom);
    shouldUpdatePermalink = false;
  });
  // Setup permalink copy to clipboard by logo click
  var title = 'Скопировать ссылку';
  $('#permalink-copy').tooltip({
    delay: { show: 500, hide: 100 },
    container: '#permalink-copy',
    title: title
  });
  var el = $("#permalink-copy");
  el.click(function(event) {
    event.preventDefault();
    copyPermlalinkToClipboard();
    el.attr('title', "Ссылка скопирована!").tooltip('_fixTitle').tooltip('show');
    scheduleTimer('permalink_copy_tooltip_hide', function () {
      el.attr('title', title).tooltip('hide').tooltip('_fixTitle');
    }, 500);
  });
}
