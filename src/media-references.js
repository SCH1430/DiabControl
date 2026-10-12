// Pure helpers shared by archive cleanup, recovery exports and unit tests.
const MediaReferences = (() => {
  function visit(value, callback) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach((item) => visit(item, callback));
    if (Array.isArray(value.photoIds)) callback(value);
    for (const [key, child] of Object.entries(value)) {
      if (key !== 'photoIds') visit(child, callback);
    }
  }
  function collect(...sources) {
    const ids = new Set();
    sources.forEach((source) => visit(source, (item) => item.photoIds.forEach((id) => ids.add(id))));
    return ids;
  }
  function remove(value, missing) {
    visit(value, (item) => {
      item.photoIds = item.photoIds.filter((id) => !missing.has(id));
    });
    return value;
  }
  return { collect, remove };
})();
if (typeof module !== 'undefined') module.exports = MediaReferences;
