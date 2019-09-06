const legendData = {
  'legend-green': {
    category: 'Отлично!',
    breakpoints: '&le;50'
  },
  'legend-yellow': {
    category: 'Не отлично, но и не ужасно',
    breakpoints: '51..100'
  },
  'legend-orange': {
    category: 'Не здорово (для некоторых)',
    breakpoints: '101..150'
  },
  'legend-red': {
    category: 'Не здорово',
    breakpoints: '151..200'
  },
  'legend-purple': {
    category: 'Совсем не здорово!',
    breakpoints: '201..300'
  },
  'legend-maroon': {
    category: 'Ужасно!',
    breakpoints: '&gt;300'
  }
}

function initLegend() {
  $('span[id^=legend-]').each(function(index, value) {
    var d = legendData[value.id];
    $(value).tooltip({
      delay: { show: 100, hide: 100 },
      placement: 'right',
      html: true,
      title: d['category'] + '<br><b>AQI: ' + d['breakpoints'] + '</b>'
    });
  });
}
