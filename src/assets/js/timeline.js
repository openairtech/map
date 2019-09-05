const TIMELINE_STEP = 10 * 60; // in seconds
const TIMELINE_LENGTH = 24 * 60 * 60 - TIMELINE_STEP; // in seconds

var timelineDay = null;
var timelineTime = null;
var timelineSliderEndTime = null;

function initTimelineController() {
  $('#timeline-slider').slider({
    min: -TIMELINE_LENGTH,
    max: 0,
    step: TIMELINE_STEP,
    value: 0,
    slide: function(event, ui) {
      timelineSliderChanged(event, ui);
    },
    change: function(event, ui) {
      timelineSliderChanged(event, ui);
    },
    create: function (event, ui) {
      timelineSliderCreated(event, ui);
    }
  });

  var datepicker = $('#timeline-datepicker');
  datepicker.datepicker({
    endDate: '+0d',
    todayHighlight: true,
    language: 'ru'
  });
  datepicker.on('changeDate', function(e) {
    timelineDatepickerChanged(e);
  });

  $("#timeline-fast-forward").click(function(event) {
    $('#timeline-datepicker').datepicker('setDate', '');
    scheduleTimer('time_ff_blur', function () {
      $("#timeline-fast-forward").blur();
    }, 0);
    event.preventDefault();
  });
  $("#timeline-step-forward").click(function(event) {
    var slider = $('#timeline-slider');
    var val = slider.slider('value');
    var min = slider.slider('option', 'min');
    var max = slider.slider('option', 'max');
    var step = slider.slider('option', 'step');
    var nextVal = val + step;
    if (nextVal <= max) {
      slider.slider('value', nextVal);
    } else if (timelineDay) {
      // Jump to the next day
      timelineDay.add(1, 'day');
      if (timelineDay.isBefore(new Date(), "day")) {
        // Next day is not today
        slider.slider('value', min);
      } else {
        // Next day is today
        timelineSliderEndTime = getTimelineRoundedNowTime();
        nextVal = max - moment(timelineSliderEndTime)
          .subtract(timelineDay.unix(), 'seconds').unix();
        timelineDay = null; // today
        slider.slider('value', nextVal);
      }
    } else {
        slider.slider('value', max);
    }
    scheduleTimer('time_sf_blur', function () {
      $("#timeline-step-forward").blur();
    }, 0);
    event.preventDefault();
  });
  $("#timeline-step-backward").click(function(event) {
    var slider = $('#timeline-slider');
    var val = slider.slider('value');
    var min = slider.slider('option', 'min');
    var max = slider.slider('option', 'max');
    var step = slider.slider('option', 'step');
    var nextVal = val - step;
    if (nextVal >= min) {
      slider.slider('value', nextVal);
    } else if (timelineDay) {
      // Jump to the day before which is not yesterday
      timelineDay.subtract(1, 'day');
      slider.slider('value', max);
    } else {
      // Jump to yesterday
      timelineDay = moment(timelineSliderEndTime).subtract(1, 'day').startOf('day');
      nextVal = min + moment(timelineSliderEndTime)
        .subtract(1, 'day')
        .subtract(timelineDay.unix(), 'seconds').unix();
      slider.slider('value', nextVal);
    }
    scheduleTimer('time_sb_blur', function () {
      $("#timeline-step-backward").blur();
    }, 0);
    event.preventDefault();
  });

  $('#timeline-date-dropup').on('show.bs.dropdown', function () {
    timelineDatepickerShow();
  })
}

function timelineDatepickerShow() {
  var datepicker = $('#timeline-datepicker');
  if (timelineDay) {
    datepicker.datepicker('update', new Date(timelineDay));
  } else {
    datepicker.datepicker('update', new Date());
  }
}

function timelineDatepickerChanged(e) {
  var date = $('#timeline-datepicker').datepicker('getDate');
  if (!date || !moment(date).isBefore(new Date(), "day")) {
    // Today's day is selected
    timelineDay = null;
    $('#timeline-slider').slider('value', 0); // slide slider to now
  } else {
    // Selected day is in the past (yesterday or earlier)
    timelineDay = moment(date);
    var slider = $('#timeline-slider');
    var min = slider.slider('option', 'min');
    slider.slider('value', min); // slide slider to start of the day
  }
  if (e.date) {
    $('#timeline-date-dropup').trigger('click'); // hide datepicker
  }
}

function timelineSliderCreated(event, ui) {
    var handles = $(event.target).find('span');
    handles.eq(0).tooltip({
        animation: false,
        placement: 'top',
        trigger: 'manual',
        container: handles.eq(0),
        title: ''
    });
}

function timelineSliderChanged(event, ui) {
  if (!timelineDay && ui.value == 0) {
    // Rewind time to now
    timelineTime = null; // now
    timelineSliderEndTime = null; // now
    var sliderTooltip = "Сейчас";
    scheduleTimer('tooltip_hide', function () {
      $(ui.handle).tooltip('hide');
    }, 1000);
  } else {
    cancelMapUpdateTimer();
    cancelTimer('tooltip_hide');
    if (timelineDay) {
      // Browsing past day (yesterday or earlier)
      // Set slider end time to the end of that day
      timelineSliderEndTime = moment(timelineDay).add(TIMELINE_LENGTH, 'seconds');
    } else if (!timelineSliderEndTime) {
      // Browsing today's day
      // Set slider end time to the now time rounded to step
      timelineSliderEndTime = getTimelineRoundedNowTime();
    }
    var sliderTime = moment(timelineSliderEndTime).add(ui.value, 'seconds');
    var sliderTooltip = sliderTime.format('lll');
    timelineTime = sliderTime.unix();
  }
  // Update tooltip
  scheduleTimer('tooltip_update', function () {
    $(ui.handle).attr('title', sliderTooltip).tooltip('_fixTitle').tooltip('show');
  }, 0);
  // Schedule map update according to updated time
  scheduleMapUpdateTimer(250);
}

function getTimelineRoundedNowTime() {
  return moment.unix(Math.ceil(moment().unix() / TIMELINE_STEP) * TIMELINE_STEP);
}

function setTimelineTime(unixTime) {
  // Default values for map time 'now'
  var sliderMax = $('#timeline-slider').slider('option', 'max');
  var sliderValue = sliderMax;
  timelineDay = null;
  timelineTime = null;
  timelineSliderEndTime = null;
  if (unixTime) {
    // Set map time and date according to given unix time
    timelineTime = unixTime;
    // Calculate corresponding map date
    var t = moment.unix(unixTime);
    if (t.isBefore(moment().subtract(1, 'day'))) {
      // Set past day time (yesterday or earlier)
      var d = moment(t).startOf('day');
      timelineDay = d;
      // Set slider end time to the end of that day
      timelineSliderEndTime = moment(d).add(TIMELINE_LENGTH, 'seconds');
    } else {
      // Set slider end time to the now time rounded to step
      timelineSliderEndTime = getTimelineRoundedNowTime();
    }
    // Calculate slide value
    sliderValue = sliderMax - timelineSliderEndTime.diff(t, 'seconds');
  }
  // Set slider value and update map
  $('#timeline-slider').slider('value', sliderValue);
}
