var timers = {};

function cancelTimer(timer) {
  clearTimeout(timers[timer]);
}

function scheduleTimer(timer, fn, timeout) {
  cancelTimer(timer);
  timers[timer] = setTimeout(fn, timeout);
}
