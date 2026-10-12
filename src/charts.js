function statsHTML(items) {
  const vals = items.map((i) => i.value),
    sum = vals.reduce((a, b) => a + b, 0);
  const entries = [
    ['Среднее', vals.length ? sugarText(sum / vals.length) : '—', unit()],
    ['Минимум', vals.length ? sugarText(vals.reduce((a, b) => Math.min(a, b))) : '—', unit()],
    ['Максимум', vals.length ? sugarText(vals.reduce((a, b) => Math.max(a, b))) : '—', unit()],
    ['Измерений', vals.length, 'за период'],
  ];
  return entries
    .map(
      ([l, v, u]) => `<div class="stat-card"><span>${l}</span><strong>${v}</strong><small>${u}</small></div>`,
    )
    .join('');
}
function renderChart(target = 'sugarChart', items = statsItems(), interactive = true) {
  if (interactive) renderChartRecords(target);
  if (!items.length) {
    $(target).innerHTML =
      `<div class="empty-state"><span class="empty-state-icon">${uiIcon('sugar')}</span><strong>Нет измерений за этот период</strong>Выберите другие даты или добавьте запись.</div>`;
    return;
  }
  const W = target === 'reportChart' ? 760 : Math.max(300, $(target).clientWidth || 640),
    H = 340,
    L = 43,
    R = 18,
    T = 18,
    B = 100,
    low = converted(data.profile.targetLow),
    high = converted(data.profile.targetHigh),
    step = data.profile.unit === 'mgdl' ? 40 : 2,
    max = Math.ceil((items.reduce((m, i) => Math.max(m, converted(i.value)), high) * 1.12) / step) * step;
  const from = target === 'reportChart' ? reportSnapshot.from : $('statsFrom').value,
    to = target === 'reportChart' ? reportSnapshot.to : $('statsTo').value;
  const times = items.map((i) => new Date(stamp(i, 'sugar')).getTime()),
    start = new Date(from + 'T00:00').getTime(),
    end = new Date(to + 'T23:59').getTime(),
    x = (t) => L + (end === start ? (W - L - R) / 2 : ((t - start) / (end - start)) * (W - L - R)),
    y = (v) => H - B - (v / max) * (H - T - B);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-labelledby="${target}Title"><title id="${target}Title">Глюкоза, ${unit()}, ${items.length} измерений</title><rect x="${L}" y="${y(high)}" width="${W - L - R}" height="${y(low) - y(high)}" class="chart-range" fill="#edf4ee"/>`;
  for (let i = 0; i <= 4; i++) {
    const v = (max * i) / 4;
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="chart-grid" stroke="#e4ebec"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  }
  svg += `<polyline class="chart-line" points="${items.map((i, n) => `${x(times[n])},${y(converted(i.value))}`).join(' ')}" fill="none" stroke="#246479" stroke-width="2"/>`;
  items.forEach((i, n) => {
    const outside = i.value < data.profile.targetLow || i.value > data.profile.targetHigh,
      cx = x(times[n]),
      cy = y(converted(i.value)),
      near = [n - 1, n + 1]
        .filter((k) => k >= 0 && k < items.length)
        .map((k) => Math.hypot(cx - x(times[k]), cy - y(converted(items[k].value)))),
      hit = Math.max(4, Math.min(18, ...near.map((distance) => distance / 2))),
      label = `${sugarText(i.value)} ${unit()} · ${dateLabel(stamp(i, 'sugar'))} · ${outside ? 'вне диапазона' : 'в диапазоне'}`;
    svg += `<g ${interactive ? `role="button" tabindex="0" aria-pressed="false" data-point="${i.id}" data-chart="${target}" aria-label="${esc(label)}"` : ''}><circle class="selection-ring" cx="${cx}" cy="${cy}" r="9" fill="none"/><circle cx="${cx}" cy="${cy}" r="${hit}" fill="transparent"/>${outside ? `<path d="M${cx} ${cy - 5}l5 5-5 5-5-5z" fill="#896333"/>` : `<circle cx="${cx}" cy="${cy}" r="4" fill="#19776e"/>`}<title>${esc(label)}</title></g>`;
  });
  for (const [type, offset, symbol] of [
    ['food', 32, '□'],
    ['insulin', 56, '△'],
  ]) {
    const cy = H - B + offset;
    svg += `<text x="${L - 9}" y="${cy + 4}" text-anchor="end">${symbol}</text><line class="chart-grid" x1="${L}" x2="${W - R}" y1="${cy}" y2="${cy}" stroke="#e4ebec"/>`;
    data[type]
      .filter((i) => inRange(i.datetime, from, to))
      .forEach((i) => {
        const cx = x(new Date(i.datetime).getTime()),
          label = `${typeNames[type]} · ${dateLabel(i.datetime)} · ${type === 'food' ? i.name : fmt(i.dose) + ' ' + (i.unit === 'legacy-xe' ? 'ХЕ — единицы не уточнены' : 'ЕД')}`;
        svg += `<g ${interactive ? `role="button" tabindex="0" aria-pressed="false" data-event="${i.id}" data-chart="${target}" aria-label="${esc(label)}"` : ''}><circle class="selection-ring" cx="${cx}" cy="${cy}" r="10" fill="none"/><circle cx="${cx}" cy="${cy}" r="11" fill="transparent"/>${type === 'food' ? `<rect class="food-marker" x="${cx - 4}" y="${cy - 4}" width="8" height="8" fill="#826224"/>` : `<path class="insulin-marker" d="M${cx} ${cy - 5}l5 9h-10z" fill="#6b5c91"/>`}<title>${esc(label)}</title></g>`;
      });
  }
  const ticks = end === start ? [start] : W < 450 ? [start, end] : [start, (start + end) / 2, end];
  ticks.forEach((t, n) => {
    const date = new Date(t);
    svg += `<text x="${x(t)}" y="${H - 16}" text-anchor="${ticks.length === 1 ? 'middle' : n === 0 ? 'start' : n === ticks.length - 1 ? 'end' : 'middle'}">${pad(date.getDate())}.${pad(date.getMonth() + 1)} ${localTime(date)}</text>`;
  });
  $(target).innerHTML = svg + '</svg>';
  if (interactive) bindChartPointer(target);
}
function renderStats() {
  const items = statsItems();
  let valid = true;
  try {
    validRange($('statsFrom').value, $('statsTo').value);
  } catch {
    valid = false;
  }
  $('statsPeriodLabel').textContent = valid
    ? `${shortDate($('statsFrom').value)} — ${shortDate($('statsTo').value)} · ${unit()}`
    : 'Проверьте границы периода.';
  $('periodStats').innerHTML = statsHTML(items);
  renderChart();
  $('chartSelection').textContent = 'Выберите измерение или событие на графике.';
  renderComparison();
  render3D();
  renderDayCompare();
}

function selectPoint(el) {
  markChartSelection(el);
  const i = data.sugar.find((i) => i.id === el.dataset.point);
  if (!i) return;
  const id = el.dataset.chart === 'expandedChart' ? 'expandedSelection' : 'chartSelection';
  $(id).textContent =
    `${dateLabel(stamp(i, 'sugar'))} · ${sugarText(i.value)} ${unit()} · ${i.value < data.profile.targetLow ? 'ниже диапазона' : i.value > data.profile.targetHigh ? 'выше диапазона' : 'в диапазоне'}`;
}

function setPreviousPeriod() {
  try {
    const [from, to] = validRange($('statsFrom').value, $('statsTo').value),
      a = Date.parse(from + 'T00:00:00Z'),
      b = Date.parse(to + 'T00:00:00Z'),
      length = Math.round((b - a) / 86400000) + 1;
    $('compareTo').value = new Date(a - 86400000).toISOString().slice(0, 10);
    $('compareFrom').value = new Date(a - length * 86400000).toISOString().slice(0, 10);
  } catch {}
  renderComparison();
}
function measurementCount(n) {
  const form = new Intl.PluralRules('ru').select(n);
  return `${n} ${{ one: 'измерение', few: 'измерения', many: 'измерений', other: 'измерения' }[form]}`;
}
function renderComparison() {
  try {
    const [from, to] = validRange($('compareFrom').value, $('compareTo').value);
    validRange($('statsFrom').value, $('statsTo').value);
    const a = statsItems(),
      b = data.sugar.filter((i) => inRange(stamp(i, 'sugar'), from, to)),
      average = (items) => (items.length ? items.reduce((s, i) => s + i.value, 0) / items.length : null);
    const aa = average(a),
      bb = average(b),
      diff = aa !== null && bb !== null ? converted(aa - bb) : null;
    $('periodComparison').innerHTML =
      `<div class="comparison-grid"><div><strong>Выбранный период</strong><p>${shortDate($('statsFrom').value)} — ${shortDate($('statsTo').value)}</p><p>${measurementCount(a.length)} · среднее ${aa === null ? '—' : sugarText(aa) + ' ' + unit()}</p></div><div><strong>Второй период</strong><p>${shortDate(from)} — ${shortDate(to)}</p><p>${measurementCount(b.length)} · среднее ${bb === null ? '—' : sugarText(bb) + ' ' + unit()}</p></div></div><p>${diff === null ? 'Для разницы средних нужно хотя бы одно измерение в каждом периоде.' : `Разница средних (первый − второй): <strong>${diff > 0 ? '+' : ''}${fmt(diff)} ${unit()}</strong>.`}</p><p class="hint">Сравнение описывает только сохранённые измерения. Оно не определяет причины изменений.</p>`;
  } catch {
    $('periodComparison').textContent = 'Выберите корректные даты обоих периодов.';
  }
}
function selectEvent(el) {
  const e = allEntries().find((e) => e.item.id === el.dataset.event);
  if (!e) return;
  const id = el.dataset.chart === 'expandedChart' ? 'expandedSelection' : 'chartSelection';
  $(id).textContent =
    `${dateLabel(e.datetime)} · ${typeNames[e.type]} · ${e.type === 'food' ? e.item.name + ' · ' + fmt(e.item.carbs) + ' г углеводов' : fmt(e.item.dose) + ' ' + (e.item.unit === 'legacy-xe' ? 'ХЕ · уточните единицы' : 'ЕД') + ' · ' + (e.item.name || 'Препарат не указан')}`;
  markChartSelection(el);
}
function markChartSelection(el) {
  document.querySelectorAll('#' + el.dataset.chart + ' [role="button"]').forEach((n) => {
    n.classList.toggle('selected-point', n === el);
    n.setAttribute('aria-pressed', String(n === el));
  });
  document.querySelectorAll('[data-chart-record]').forEach((button) => {
    if (button.dataset.chartTarget !== el.dataset.chart) return;
    button.setAttribute('aria-pressed', String(button.dataset.chartRecord === (el.dataset.point || el.dataset.event)));
  });
}
