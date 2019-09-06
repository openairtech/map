const legendData = {
  'legend-green': {
    title: 'Отлично!<br>AQI: &le;50'
  },
  'legend-yellow': {
    title: 'Не отлично, но и не ужасно<br>AQI: 51..100'
  },
  'legend-orange': {
    title: 'Не здорово (для некоторых)<br>AQI: 101..150'
  },
  'legend-red': {
    title: 'Не здорово<br>AQI: 151..200'
  },
  'legend-purple': {
    title: 'Совсем не здорово!<br>AQI: 201..300'
  },
  'legend-maroon': {
    title: 'Ужасно!<br>AQI: &gt;300'
  }
}

function initLegend() {
  $('span[id^=legend-]').each(function(index, value) {
    var d = legendData[value.id];
    $(value).tooltip({
      delay: { show: 100, hide: 100 },
      placement: 'right',
      html: true,
      title: d['title']
    });
  });
}
