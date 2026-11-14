// GTI is a mean W/m² value over the hour ending at each API timestamp.
(function (root) {
  function estimate(hourly, start, end, kwp, loss) {
    if (!Number.isFinite(kwp) || kwp <= 0 || !Number.isFinite(loss) || loss < 0 || loss >= 100) throw new Error('Thông số hệ thống không hợp lệ.');
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Mốc thời gian không hợp lệ.');
    if (!Array.isArray(hourly?.time) || !Array.isArray(hourly.global_tilted_irradiance)) throw new Error('Thiếu dữ liệu bức xạ.');
    let irradiation = 0, covered = 0, previous = -Infinity;
    const hours = [];
    hourly.time.forEach((time, i) => {
      if (!Number.isFinite(time) || time <= previous) throw new Error('Mốc thời gian không hợp lệ.');
      if (previous !== -Infinity && time - previous !== 3600) throw new Error('Mốc thời gian không hợp lệ.');
      previous = time;
      const overlap = Math.max(0, Math.min(time, end) - Math.max(time - 3600, start));
      if (!overlap) return;
      const radiation = hourly.global_tilted_irradiance[i];
      if (!Number.isFinite(radiation) || radiation < 0) throw new Error('Dữ liệu bức xạ hôm nay chưa đầy đủ.');
      covered += overlap;
      const sunHours = radiation / 1000 * overlap / 3600;
      irradiation += sunHours;
      hours.push({ time, kwh: kwp * sunHours * (1 - loss / 100) });
    });
    if (covered !== end - start) throw new Error('Chưa có đủ dữ liệu cho cả ngày. Hãy thử cập nhật lại.');
    return { irradiation, kwh: kwp * irradiation * (1 - loss / 100), hours };
  }
  // Planning reserve only: the irradiance forecast already includes cloud effects.
  function weatherReserve(hourly, estimate) {
    const index = new Map(hourly.time.map((time, i) => [time, i]));
    let reduction = 0, clouds = 0, rainyEnergy = 0;
    for (const hour of estimate.hours) {
      if (hour.kwh <= 0) continue;
      const i = index.get(hour.time);
      const cloud = hourly.cloud_cover?.[i], rain = hourly.rain?.[i], showers = hourly.showers?.[i];
      if (!Number.isFinite(cloud) || cloud < 0 || cloud > 100 || !Number.isFinite(rain) || rain < 0 || !Number.isFinite(showers) || showers < 0) return null;
      const wet = rain + showers;
      // Explicit heuristic: up to 15% cloud reserve + up to 10% rain reserve.
      const factor = Math.max(0, (cloud - 50) / 50) * 0.15 + Math.min(wet / 2, 1) * 0.10;
      reduction += hour.kwh * factor;
      clouds += hour.kwh * cloud;
      if (wet > 0) rainyEnergy += hour.kwh;
    }
    return { kwh: Math.max(0, estimate.kwh - reduction), percent: estimate.kwh > 0 ? reduction / estimate.kwh * 100 : 0, cloudCover: estimate.kwh > 0 ? clouds / estimate.kwh : 0, rain: rainyEnergy > 0 };
  }
  root.Energy = { estimate, weatherReserve };
  if (typeof module !== 'undefined') module.exports = root.Energy;
})(typeof window !== 'undefined' ? window : globalThis);
