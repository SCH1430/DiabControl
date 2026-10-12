const routePages = ['today', 'diary', 'food', 'stats'];
function savedRoute() {
  try {
    return sessionStorage.getItem('diab-last-page') || 'today';
  } catch {
    return 'today';
  }
}
function routePage() {
  const hash = location.hash.slice(1);
  return routePages.includes(hash) ? hash : savedRoute();
}
function navigate(page, { historyMode = 'push', focus = true } = {}) {
  if (!session) return;
  if (!routePages.includes(page)) page = 'today';
  currentPage = page;
  for (const name of routePages) {
    const route = $('page' + name[0].toUpperCase() + name.slice(1));
    stopEntrance(route);
    route.classList.toggle('hidden', name !== page);
    const button = $('nav' + name[0].toUpperCase() + name.slice(1));
    if (name === page) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  try {
    sessionStorage.setItem('diab-last-page', page);
  } catch {}
  if (location.hash !== '#' + page) {
    if (historyMode === 'replace') history.replaceState(null, '', '#' + page);
    else if (historyMode === 'push') history.pushState(null, '', '#' + page);
  }
  render();
  animateEntrance($('page' + page[0].toUpperCase() + page.slice(1)));
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (focus) {
    const heading = $('page' + page[0].toUpperCase() + page.slice(1)).querySelector('h1');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}
function followHistory() {
  if (!session) return;
  if (busy) {
    setTimeout(followHistory, 50);
    return;
  }
  if (activeModal) closeModal(false);
  navigate(routePage(), { historyMode: 'none' });
}
window.addEventListener('popstate', followHistory);
window.addEventListener('hashchange', () => {
  if (session && routePage() !== currentPage) followHistory();
});
