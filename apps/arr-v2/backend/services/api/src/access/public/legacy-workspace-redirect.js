(() => {
  function keepLegacyWorkspace() {
    const { hash, search } = window.location;
    const searchParams = new URLSearchParams(search);
    return hash === '#staff'
      || hash.startsWith('#activate=')
      || searchParams.get('production') === '1';
  }

  if (keepLegacyWorkspace()) return;
  window.setTimeout(() => {
    if (keepLegacyWorkspace()) return;
    window.location.replace('https://access.arrweb.com/api/access-demo/production.html');
  }, 1000);
})();
