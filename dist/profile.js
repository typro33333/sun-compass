(function (root) {
  const name = 'sol_pv_profile';
  function valid(p) {
    return p?.version === 1 && [['kwp', 0.1, 100000], ['loss', 0, 80], ['tilt', 0, 90], ['azimuth', 0, 360], ['lat', -90, 90], ['lon', -180, 180], ['offset', -12, 14]].every(([key, min, max]) => Number.isFinite(p[key]) && p[key] >= min && p[key] <= max);
  }
  function read(cookie) {
    try {
      const value = cookie.split(';').map(x => x.trim()).find(x => x.startsWith(name + '='));
      const profile = JSON.parse(decodeURIComponent(value?.slice(name.length + 1)));
      return valid(profile) ? profile : null;
    } catch { return null; }
  }
  function encode(profile, secure) {
    if (!valid(profile)) throw new Error('Invalid profile');
    return `${name}=${encodeURIComponent(JSON.stringify(profile))}; Max-Age=31536000; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
  }
  root.SolarProfile = { read, encode };
  if (typeof module !== 'undefined') module.exports = root.SolarProfile;
})(typeof window !== 'undefined' ? window : globalThis);
