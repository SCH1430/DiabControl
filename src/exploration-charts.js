function render3D() {
  if (chartView !== '3d' || !session) return;
  const from = $('statsFrom').value,
    to = $('statsTo').value,
    days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1,
    items = statsItems();
  if (!Number.isFinite(days) || days < 1 || days > 31 || !items.length) {
    $('chart3d').innerHTML = '<p class="empty-state">Для 3D выберите период до 31 дня с измерениями.</p>';
    $('chart3dPoint').innerHTML = '';
    $('chart3dSelection').textContent = '';
    $('chart3dInfo').textContent = '';
    threeDPoints = [];
    return;
  }
  const readings = items.slice(-1500);
  if (!readings.some((i) => i.id === threeDSelected)) threeDSelected = readings.at(-1).id;
  const angle = Number($('chart3dYaw').value),
    a = (angle * Math.PI) / 180,
    pitch = (34 * Math.PI) / 180,
    W = Math.max(270, $('chart3d').clientWidth),
    H = W < 450 ? 350 : 430,
    max =
      Math.ceil(
        Math.max(...readings.map((i) => converted(i.value))) / (data.profile.unit === 'mgdl' ? 40 : 2),
      ) * (data.profile.unit === 'mgdl' ? 40 : 2);
  const raw = (x, y, z) => ({
      x: x * Math.cos(a) + z * Math.sin(a),
      y: -y * Math.cos(pitch) + (-x * Math.sin(a) + z * Math.cos(a)) * Math.sin(pitch),
    }),
    bounds = [];
  for (const x of [-11, 11]) for (const y of [0, 14]) for (const z of [-6.6, 6.6]) bounds.push(raw(x, y, z));
  const xs = bounds.map((p) => p.x),
    ys = bounds.map((p) => p.y),
    left = Math.min(...xs),
    top = Math.min(...ys),
    scale = Math.min((W - 80) / (Math.max(...xs) - left), (H - 95) / (Math.max(...ys) - top)),
    P = (x, y, z) => {
      const p = raw(x, y, z);
      return {
        x: (W - (Math.max(...xs) - left) * scale) / 2 + (p.x - left) * scale,
        y: 35 + (p.y - top) * scale,
      };
    },
    L = (p, q, cl = 'space-grid') => `<line class="${cl}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`,
    T = (p, t, anchor = 'middle') => `<text x="${p.x}" y="${p.y}" text-anchor="${anchor}">${t}</text>`;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Трёхмерная история измерений: время, день и глюкоза"><title>Измерения в 3D</title>`;
  const zday = (d) => (days === 1 ? 0 : -6.6 + (d / (days - 1)) * 13.2);
  for (let d = 0; d < days; d++) {
    const z = zday(d);
    svg += L(P(-11, 0, z), P(11, 0, z));
    if (days <= 7 || d === 0 || d === days - 1 || d % Math.ceil(days / 7) === 0) {
      const p = P(11.5, 0, z),
        dt = new Date(Date.parse(from) + d * 86400000).toISOString().slice(0, 10);
      svg += T({ x: p.x + 5, y: p.y + 4 }, dt.slice(8) + '.' + dt.slice(5, 7), 'start');
    }
  }
  for (const h of [0, 6, 12, 18, 24]) {
    const x = (h / 24) * 22 - 11;
    svg += L(P(x, 0, -6.6), P(x, 0, 6.6));
    if (W >= 450 || h % 12 === 0) {
      const p = P(x, 0, 6.6);
      svg += T({ x: p.x, y: p.y + 22 }, pad(h) + ':00');
    }
  }
  svg += L(P(-11, 0, 6.6), P(-11, 14, 6.6), 'space-axis');
  for (let k = 0; k <= 4; k++) {
    const p = P(-11, (k / 4) * 14, 6.6);
    svg += T({ x: p.x - 7, y: p.y + 4 }, fmt((max * k) / 4), 'end');
  }
  const y = P(-11, 14, 6.6),
    x = P(0, 0, 6.6);
  svg += T({ x: y.x - 25, y: y.y - 14 }, unit(), 'start') + T({ x: x.x, y: x.y + 43 }, 'Время суток');
  threeDPoints = readings.map((i) => {
    const minutes = Number(i.time.slice(0, 2)) * 60 + Number(i.time.slice(3)),
      d = Math.round((Date.parse(i.date) - Date.parse(from)) / 86400000),
      x = (minutes / 1440) * 22 - 11,
      z = zday(d);
    return { item: i, ...P(x, (converted(i.value) / max) * 14, z), base: P(x, 0, z) };
  });
  for (const p of threeDPoints) {
    const selected = p.item.id === threeDSelected;
    svg +=
      L(p.base, p, selected ? 'space-stem selected' : 'space-stem') +
      `<circle class="space-point" cx="${p.x}" cy="${p.y}" r="${selected ? 5 : 3.5}"/>${selected ? `<circle class="space-ring" cx="${p.x}" cy="${p.y}" r="9"/>` : ''}`;
  }
  $('chart3d').innerHTML = svg + '</svg>';
  $('chart3dPoint').innerHTML = readings
    .map(
      (i) =>
        `<option value="${i.id}" ${i.id === threeDSelected ? 'selected' : ''}>${esc(dateLabel(stamp(i, 'sugar')))} · ${sugarText(i.value)} ${unit()}</option>`,
    )
    .join('');
  const chosen = readings.find((i) => i.id === threeDSelected);
  $('chart3dSelection').textContent =
    `${dateLabel(stamp(chosen, 'sugar'))} · ${sugarText(chosen.value)} ${unit()}${chosen.note ? ' · ' + chosen.note : ''}`;
  $('chart3dInfo').textContent =
    `Каждая точка — отдельная запись. Высота — глюкоза, основание — время суток и дата. ${items.length > 1500 ? 'Показаны последние 1500 из ' + items.length + ' измерений.' : ''} Поверните график мышью или ползунком.`;
  $('chart3dAngle').textContent = angle + '°';
}
function chartMode(mode) {
  chartView = mode;
  $('chart3dPanel').classList.toggle('hidden', mode !== '3d');
  $('sugarChart').classList.toggle('hidden', mode === '3d');
  $('chartSelection').classList.toggle('hidden', mode === '3d');
  $('expandChartBtn').classList.toggle('hidden', mode === '3d');
  $('chart2dLegend').classList.toggle('hidden', mode === '3d');
  document
    .querySelectorAll('[data-chart-view]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.chartView === mode)));
  if (mode === '3d') render3D();
  else renderStats();
}
function renderDayCompare(loadNote = false) {
  const a = $('dayCompareA').value,
    b = $('dayCompareB').value;
  if (!a || !b) return;
  const days = [a, b],
    entries = allEntries().filter(
      (e) => days.includes(e.datetime?.slice(0, 10)) && new Date(e.datetime) <= new Date(),
    ),
    items = entries.filter((e) => e.type === 'sugar');
  if (loadNote)
    $('dayCompareNote').value = data.dayComparisons.find((n) => n.a === a && n.b === b)?.note || '';
  const W = Math.max(300, $('dayCompareChart').clientWidth || 640),
    H = 330,
    L = 48,
    R = 18,
    T = 25,
    B = 85,
    max = Math.max(2, ...items.map((e) => converted(e.item.value))) * 1.12,
    x = (d) => L + ((Number(d.slice(11, 13)) * 60 + Number(d.slice(14, 16))) / 1440) * (W - L - R),
    y = (v) => H - B - (converted(v) / max) * (H - T - B);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Сравнение двух дней по времени суток"><title>Два дня на одной шкале</title>`;
  for (let i = 0; i <= 4; i++) {
    const yy = H - B - (i / 4) * (H - T - B);
    svg += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" class="space-grid"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end">${fmt((max * i) / 4)}</text>`;
  }
  [0, 6, 12, 18, 24].forEach((h) => {
    if (W >= 450 || h % 12 === 0)
      svg += `<text x="${L + (h / 24) * (W - L - R)}" y="${H - 14}" text-anchor="${h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}">${pad(h)}:00</text>`;
  });
  for (let index = 0; index < 2; index++) {
    const date = days[index],
      series = items
        .filter((e) => e.datetime.slice(0, 10) === date)
        .sort((a, b) => a.datetime.localeCompare(b.datetime)),
      cls = index === 0 ? 'compare-a' : 'compare-b';
    svg += `<polyline class="${cls}" fill="none" stroke-width="2" ${index ? 'stroke-dasharray="5 4"' : ''} points="${series.map((e) => `${x(e.datetime)},${y(e.item.value)}`).join(' ')}"/>`;
    for (const e of series)
      svg += `<g role="button" tabindex="0" data-compare-point="${e.item.id}" aria-label="${esc(dateLabel(e.datetime))} ${sugarText(e.item.value)} ${unit()}"><circle cx="${x(e.datetime)}" cy="${y(e.item.value)}" r="14" fill="transparent"/><circle class="${cls}" cx="${x(e.datetime)}" cy="${y(e.item.value)}" r="4"/></g>`;
    for (const e of entries.filter((e) => e.type !== 'sugar' && e.datetime.slice(0, 10) === date)) {
      const xx = x(e.datetime),
        yy = H - B + 25 + index * 22;
      svg += `<text class="event-mark ${cls}" x="${xx}" y="${yy}" text-anchor="middle" role="button" tabindex="0" data-compare-event="${e.item.id}" aria-label="${esc(dateLabel(e.datetime) + ' ' + entryDescription(e.type, e.item))}">${{ food: '■', insulin: '▲', wellbeing: '✎' }[e.type]}</text>`;
    }
  }
  svg += `<text x="${L}" y="15">${unit()}</text></svg>`;
  $('dayCompareChart').innerHTML = svg;
  $('dayCompareInfo').innerHTML =
    `<span class="day-key first">● ${shortDate(a)}: ${items.filter((e) => e.datetime.slice(0, 10) === a).length} измерений</span> · <span class="day-key second">◇ ${shortDate(b)}: ${items.filter((e) => e.datetime.slice(0, 10) === b).length} измерений</span><br>Линии связывают отдельные записи. ■ Еда · ▲ Инсулин · ✎ Самочувствие / активность.`;
}
