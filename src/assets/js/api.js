var ajaxRequest;

function initApi() {
  ajaxRequest = getXmlHttpObject();
  if (ajaxRequest == null) {
    return;
  }
  if (ajaxRequest.overrideMimeType) {
    ajaxRequest.overrideMimeType("application/json");
  }
}

function getXmlHttpObject() {
  if (window.XMLHttpRequest) {
    return new XMLHttpRequest();
  }
  if (window.ActiveXObject) {
    return new ActiveXObject("Microsoft.XMLHTTP");
  }
  return null;
}

function apiGet(request, onSuccess, onError) {
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
