// All entry points use the existing forms, including their encrypted draft lifecycle.
function bindEntryLauncherEvents() {
  if ($('entryLauncherBtn')) return;
  const picker = $('entryLauncherModal');
  const area = document.querySelector('#appMain .user-area');
  if (!picker || !area) return;
  const launcher = document.createElement('button');
  launcher.id = 'entryLauncherBtn';
  launcher.type = 'button';
  launcher.className = 'entry-launcher-btn';
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-controls', 'entryLauncherModal');
  launcher.setAttribute('aria-label', 'Добавить запись');
  launcher.innerHTML = '<span aria-hidden="true">＋</span><span>Запись</span>';
  area.insertBefore(launcher, $('emergencyBtn'));
  picker.querySelectorAll('[data-launch-entry]').forEach((button) => {
    button.querySelector('.entry-launcher-symbol').innerHTML = uiIcon(button.dataset.launchEntry);
  });
  launcher.addEventListener('click', () => {
    if (!session || busy || activeModal) return;
    openModal('entryLauncherModal');
  });
  picker.addEventListener('click', (event) => {
    const button = event.target.closest('[data-launch-entry]');
    if (!button || !session || busy) return;
    const type = button.dataset.launchEntry;
    if (!['sugar', 'food', 'insulin', 'wellbeing'].includes(type)) return;
    run(async () => {
      await flushDrafts();
      if (!session) return;
      openEntry(type);
      // The picker is now hidden; return to the persistent launcher when the form closes.
      previousFocus = launcher;
    });
  });
}
