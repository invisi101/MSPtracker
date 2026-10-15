// Desktop mode (MSP_DESKTOP=1, set by the packaged launchers): the app stops itself once its
// window has gone, so nothing is left running in the background.
//
// Every open page pings /api/alive. On closing, a page sends a "bye" and the app stops a few
// seconds later unless another page pings first (a reload sends bye and then pings again). If the
// bye never arrives, the app stops once pings have been missing for IDLE_MS. That is long on
// purpose: browsers slow timers in hidden or minimised windows to about once a minute.
// The launchers also stop the app the moment the window's browser process exits; this is the
// fallback for when the page opened in an ordinary browser tab.
const IDLE_MS = 150_000;
const BYE_MS = 5_000;
let deadline = null;

export function alive(bye = false) {
  if (process.env.MSP_DESKTOP !== '1') return;
  deadline = Date.now() + (bye ? BYE_MS : IDLE_MS);
}

if (process.env.MSP_DESKTOP === '1') {
  setInterval(() => {
    if (deadline && Date.now() > deadline) process.exit(0);
  }, 1000).unref();
}
