// The same symbols identify record types throughout the app; meaning is also in text.
function uiIcon(kind, className = 'icon') {
  const paths = {
    sugar: 'M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z M8 15a4 4 0 0 0 4 4',
    food: 'M4 3v7m3-7v7m3-7v7M4 8h6M7 10v11M18 3c-5 4-5 9 0 9V3v18',
    insulin: 'm14 3 7 7m-5-5-4 4m-8 4 7 7m-4-4-4 5m3-9 6 6 7-7-6-6Z',
    wellbeing: 'M20 5c-3-3-6 0-8 2-2-2-5-5-8-2-5 5 4 12 8 16 4-4 13-11 8-16Z M5 12h4l2-3 2 6 2-3h4',
    shield: 'm12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5Z m-4 9 3 3 5-6',
    conscious: 'M12 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0 M2 21v-2a6 6 0 0 1 12 0v2 m2-8 2 2 4-5',
    unconscious: 'M4 17h16M5 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm5-2h5l4 3h3M2 20v-3m20 3v-3',
    unsafe: 'M12 3 2 21h20Z M12 9v5m0 3v.1',
    call: 'm8 3-4 2c-3 7 8 18 15 15l2-4-5-3-2 3c-3-1-5-3-6-6l3-2Z',
  };
  return `<svg viewBox="0 0 24 24" class="${className}" aria-hidden="true" focusable="false"><path d="${paths[kind] || paths.sugar}"/></svg>`;
}
function renderHomeGlucoseRange(last) {
  const host = $('homeGlucoseRange');
  if (!last) { host.innerHTML = ''; delete host.dataset.state; return; }
  const { targetLow: low, targetHigh: high } = data.profile;
  host.dataset.state = last.value < low ? 'low' : last.value > high ? 'high' : 'range';
  // A clearly labelled display scale, extended to include this actual measurement.
  const max = Math.max(12, high * 1.3, last.value * 1.12);
  const percentage = value => Math.max(0, Math.min(100, value / max * 100));
  host.innerHTML = `<div class="glucose-scale-heading"><span>Ваш целевой диапазон</span><strong>${sugarText(low)}–${sugarText(high)} ${unit()}</strong></div><div class="glucose-scale" role="img" aria-label="Последнее измерение ${sugarText(last.value)} ${unit()}; ваш целевой диапазон от ${sugarText(low)} до ${sugarText(high)} ${unit()}"><span class="glucose-scale-target" style="left:${percentage(low)}%;width:${percentage(high)-percentage(low)}%"></span><span class="glucose-scale-marker" style="left:${percentage(last.value)}%"></span></div><div class="glucose-scale-labels" aria-hidden="true"><span>0</span><span>${sugarText(max)} ${unit()}</span></div>`;
}
