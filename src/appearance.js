function applyAppearance(pref = data.preferences) {
  const dark =
    pref.theme === 'dark' || (pref.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.classList.toggle('large-text', pref.largeText);
  document.documentElement.classList.toggle('high-contrast', pref.highContrast);
  document.documentElement.classList.toggle('reduce-motion', pref.motion === false);
  if (pref.motion === false) document.getAnimations().forEach((animation) => animation.cancel());
  document.querySelector('meta[name="theme-color"]').content = dark ? '#101b2b' : '#f4f6fa';
}
function fillAppearance() {
  const p = data.preferences;
  $('themeChoice').value = p.theme;
  $('largeTextChoice').checked = p.largeText;
  $('contrastChoice').checked = p.highContrast;
  $('motionChoice').checked = p.motion;
  for (const key of homeSections)
    $('show' + key[0].toUpperCase() + key.slice(1)).checked = p.home[key];
}
function appearanceFromForm() {
  return {
    ...data.preferences,
    theme: $('themeChoice').value,
    largeText: $('largeTextChoice').checked,
    highContrast: $('contrastChoice').checked,
    motion: $('motionChoice').checked,
    home: Object.fromEntries(homeSections.map((key) => [key, $('show' + key[0].toUpperCase() + key.slice(1)).checked])),
  };
}
function renderHomeExtras(last) {
  const p = data.preferences;
  for (const key of homeSections)
    $('home' + key[0].toUpperCase() + key.slice(1)).classList.toggle('hidden', !p.home[key]);
  document
    .querySelector('.today-grid')
    .classList.toggle('single-card', !p.home.measurement || !p.home.summary);
  $('lastSugarContext').textContent = last ? [tagNames[last.tag], last.note].filter(Boolean).join(' · ') : '';
  $('lastSugarContext').classList.toggle('hidden', !$('lastSugarContext').textContent);
  renderDraftNudge();
  renderHomeContent();
}
function renderDraftNudge() {
  const types = entryTypes.filter((t) => session?.record.drafts?.[t]);
  $('draftNudge').classList.toggle('hidden', !types.length);
  $('draftNudge').innerHTML = types.length
    ? '<strong>Есть незавершённые записи</strong><div class="button-row">' +
      types
        .map((t) => `<button class="text-btn" type="button" data-add="${t}">${typeNames[t]} →</button>`)
        .join('') +
      '</div>'
    : '';
}
function renderSuggestions(type) {
  if (type === 'wellbeing') return;
  const counts = {};
  for (const i of data[type]) if (i.tag) counts[i.tag] = (counts[i.tag] || 0) + 1;
  $(type + 'RecentTags').innerHTML = Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 3)
    .map(
      (tag) =>
        `<button class="secondary" type="button" data-quick-tag="${tag}" data-tag-type="${type}">${tagNames[tag]}</button>`,
    )
    .join('');
  if (type === 'insulin') {
    const names = [
      ...new Set(
        [
          ...data.insulin
            .slice()
            .reverse()
            .map((i) => i.name),
          data.profile.shortInsulinName,
          data.profile.longInsulinName,
        ].filter(Boolean),
      ),
    ].slice(0, 15);
    $('insulinSuggestions').innerHTML = names.map((n) => `<option value="${esc(n)}"></option>`).join('');
  }
}
