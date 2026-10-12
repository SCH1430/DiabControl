function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function backup() {
  await flushDrafts();
  const photos = await backupPhotos();
  const exportedAt = new Date().toISOString(),
    next = clone(data);
  next.preferences.lastExportAt = exportedAt;
  next.preferences.changesSinceExport = 0;
  let metadataSaved = true;
  try {
    await persist(next, false);
  } catch {
    metadataSaved = false;
  }
  download(
    `DiabControl-${localDate()}-${localTime().replace(':', '')}.json`,
    JSON.stringify(
      { format: 'DiabControl-encrypted-backup', version: 2, exportedAt, record: session.record, photos },
      null,
      2,
    ),
    'application/json',
  );
  render();
  notice(
    metadataSaved
      ? 'Копия передана браузеру для скачивания.'
      : 'Копия сохранённых данных передана браузеру. Не удалось обновить отметку о выгрузке.',
  );
}
