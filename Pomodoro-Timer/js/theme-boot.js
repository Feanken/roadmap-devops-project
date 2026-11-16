// Runs before first paint so the saved colour theme never flashes the default one.
// Deliberately tiny and dependency-free (a classic script, not an ES module);
// js/ui/theme.js validates the value and takes over once the app has loaded.
try {
  var saved = JSON.parse(localStorage.getItem('pomodoro.theme.v1'));
  if (typeof saved === 'string' && /^[a-z]{1,16}$/.test(saved)) document.documentElement.dataset.theme = saved;
} catch (e) { /* storage unavailable: keep the default theme */ }
