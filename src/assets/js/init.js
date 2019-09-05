function init() {
  var locale = window.navigator.userLanguage || window.navigator.language;
  moment.locale(locale);

  initApi();

  initMap();

  var mapCenter = {{ .Param "map_center" }};
  var mapZoom = {{ .Param "map_zoom" }};

  if (map.restoreView()) {
    mapCenter = map.getCenter();
    mapZoom = map.getZoom();
  }

  var permalinkData = getPermalinkData(mapZoom, mapCenter, 0);

  setupPermalink(map);

  initTimelineController();

  setTimelineTime(permalinkData.time);
  map.setView(permalinkData.center, permalinkData.zoom);
}
