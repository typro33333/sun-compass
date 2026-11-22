(function (root) {
  const name = 'sol_pv_profile';
  function valid(p) {
    return p?.version === 1 && [['kwp', 0.1, 100000], ['loss', 0, 80], ['tilt', 0, 90], ['azimuth', 0, 360], ['lat', -90, 90], ['lon', -180, 180], ['offset', -12, 14]].every(([key, min, max]) => Number.isFinite(p[key]) && p[key] >= min && p[key] <= max);
  }
  function read(storage = root.localStorage) {
    try { const profile = JSON.parse(storage.getItem(name)); return valid(profile) ? profile : null; }
    catch { return null; }
  }
  function write(profile, storage = root.localStorage) {
    if (!valid(profile)) throw new Error('Invalid profile');
    storage.setItem(name, JSON.stringify(profile));
    if (JSON.stringify(read(storage)) !== JSON.stringify(profile)) throw new Error('Storage unavailable');
  }
  function migrate(storage = root.localStorage, doc = root.document) {
    const saved = read(storage);
    try {
      const value = doc.cookie.split(';').map(x => x.trim()).find(x => x.startsWith(name + '='));
      if (!value) return saved;
      const legacy = JSON.parse(decodeURIComponent(value.slice(name.length + 1)));
      if (!saved && valid(legacy)) write(legacy, storage);
      doc.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      return read(storage);
    } catch { return saved; }
  }
  root.SolarProfile = { read, write, migrate };
  if (typeof module !== 'undefined') module.exports = root.SolarProfile;
})(typeof window !== 'undefined' ? window : globalThis);
