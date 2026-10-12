// Installation is optional. The portable file never registers a worker or uses the network.
let installPrompt = null;
let waitingWorker = null;
async function setupInstallation() {
  const status = $('installationStatus');
  if (!['http:', 'https:'].includes(location.protocol)) {
    status.textContent =
      'Для установки откройте «Запустить.command» из папки проекта. Перед переносом сохраните здесь зашифрованную копию, а в новой версии выберите «Восстановить из копии».';
    return;
  }
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = '/manifest.webmanifest';
  document.head.append(link);
  const icon = document.createElement('link');
  icon.rel = 'apple-touch-icon';
  icon.href = '/icons/icon-192.png';
  document.head.append(icon);
  if (!('serviceWorker' in navigator) || !isSecureContext) {
    status.textContent =
      'Для установки и работы без сети откройте приложение по HTTPS или через локальный запуск из папки проекта.';
    return;
  }
  status.textContent = 'Подготавливаем приложение для работы без сети…';
  const announceUpdate = (worker) => {
    waitingWorker = worker;
    $('appUpdateBanner').classList.remove('hidden');
  };
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    if (registration.waiting) announceUpdate(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) announceUpdate(worker);
      });
    });
    await navigator.serviceWorker.ready;
    status.textContent =
      'Приложение готово к работе без сети. В браузере с поддержкой установки используйте меню «Установить приложение» или «На экран Домой». Данные остаются в этом браузере; для другого устройства нужна зашифрованная копия.';
  } catch {
    status.textContent =
      'Не удалось подготовить работу без сети. Приложение доступно, пока запущен локальный сервер. Повторите открытие позже.';
  }
}
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  $('installAppBtn').classList.remove('hidden');
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  $('installAppBtn').classList.add('hidden');
});
$('installAppBtn').onclick = async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $('installAppBtn').classList.add('hidden');
};
$('applyUpdateBtn').onclick = async () => {
  if (busy || !waitingWorker) return;
  await flushDrafts();
  if (document.querySelector('.draft-error:not(:empty)')) {
    notice('Не удалось сохранить черновик. Скопируйте незавершённый ввод перед обновлением.', true);
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  waitingWorker.postMessage({ type: 'ACTIVATE_UPDATE' });
};
setupInstallation();
