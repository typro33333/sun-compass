(() => {
  let active = false, pending = false, timer, frame, lastEvent;
  let source = null, lastValidAt = 0, tilted = false, lastStatus = '';
  const state = globalThis.compassState = { active: false, ready: false };
  const status = message => { if (message !== lastStatus) { lastStatus = message; $('sensor-status').textContent = message; } };
  function stopSensor(message) {
    active = false; state.active = false; state.ready = false;
    source = null; lastValidAt = 0; tilted = false;
    window.removeEventListener('deviceorientation', orientation);
    window.removeEventListener('deviceorientationabsolute', orientation);
    window.removeEventListener('orientationchange', screenChanged);
    window.screen?.orientation?.removeEventListener('change', screenChanged);
    clearTimeout(timer);
    if (frame) cancelAnimationFrame(frame);
    frame = null; lastEvent = null;
    $('sensor').textContent = 'Bật la bàn thiết bị';
    $('sensor').setAttribute('aria-pressed', 'false');
    $('heading-label').textContent = `↑ ${Math.round(heading)}° ${direction(heading)} · Giữ hướng`;
    status(message); draw();
  }
  function screenChanged() { if (lastEvent) orientation(lastEvent); }
  function orientation(event) {
    if (!active) return;
    const apple = Number.isFinite(event.webkitCompassHeading) && event.webkitCompassHeading >= 0;
    const absolute = event.absolute === true || event.type === 'deviceorientationabsolute';
    if (!apple && (!absolute || !Number.isFinite(event.alpha))) {
      if (state.ready) return;
      status('Chỉ nhận được chuyển động tương đối, chưa xác định được hướng Bắc. Hãy mở bằng Safari/Chrome và cho phép cảm biến.');
      return;
    }
    const incomingSource = apple ? 'webkit' : event.type === 'deviceorientationabsolute' ? 'absolute' : 'orientation';
    if (source && source !== incomingSource && Date.now() - lastValidAt < 3000) return;
    if (apple && Number.isFinite(event.webkitCompassAccuracy) && event.webkitCompassAccuracy < 0) {
      status('Cảm biến chưa hiệu chỉnh. Đưa máy xa kim loại và di chuyển nhẹ theo hình số 8.');
      return;
    }
    source = incomingSource; lastValidAt = Date.now(); state.ready = true;
    lastEvent = event;
    clearTimeout(timer);
    const raw = apple ? event.webkitCompassHeading : 360 - event.alpha;
    const angle = window.screen?.orientation?.angle ?? (Number.isFinite(window.orientation) ? window.orientation : 0);
    // The top of a landscape screen is rotated from the device's natural top.
    heading = ((raw - angle) % 360 + 360) % 360;
    $('heading-label').textContent = `↑ ${Math.round(heading)}° ${direction(heading)}`;
    $('sensor').textContent = 'Tắt la bàn';
    if (Number.isFinite(event.beta) && Number.isFinite(event.gamma)) {
      const inclination = Math.max(Math.abs(event.beta), Math.abs(event.gamma));
      if (inclination > 40) tilted = true;
      else if (inclination < 30) tilted = false;
    }
    status(tilted ? 'Đã nhận cảm biến. Hãy giữ máy nằm phẳng để đọc hướng chính xác hơn.' : 'La bàn đang hoạt động · Xoay máy nằm phẳng để thấy các hướng đổi theo bạn.');
    if (!frame) frame = requestAnimationFrame(() => { frame = null; draw(); });
    timer = setTimeout(() => stopSensor('Cảm biến đã ngừng gửi dữ liệu. Bấm bật lại; nếu vẫn lỗi, mở trang trực tiếp bằng Safari/Chrome.'), 8000);
  }
  $('sensor').onclick = async () => {
    if (pending) return;
    if (active) { stopSensor('Đã tắt cảm biến. Giữ nguyên hướng la bàn vừa xem.'); return; }
    if (!window.isSecureContext) {
      status('Cảm biến cần HTTPS. Địa chỉ http://192.168… trên điện thoại không dùng được la bàn; hãy mở bản HTTPS.');
      return;
    }
    const api = window.DeviceOrientationEvent;
    if (!api) { status('Trình duyệt không cung cấp cảm biến hướng. Thử mở trực tiếp bằng Safari trên iPhone hoặc Chrome trên Android.'); return; }
    pending = true; $('sensor').disabled = true;
    try {
      // Must be called from this user gesture, with absolute/magnetometer access.
      if (typeof api.requestPermission === 'function' && await api.requestPermission(true) !== 'granted') {
        status('Quyền chuyển động/hướng đã bị từ chối. Cho phép quyền cảm biến trong cài đặt trang rồi bấm bật lại.');
        return;
      }
      active = true; state.active = true; state.ready = false;
      $('sensor').setAttribute('aria-pressed', 'true');
      $('sensor').textContent = 'Hủy / tắt la bàn';
      status('Đang chờ cảm biến hướng Bắc… Giữ điện thoại nằm phẳng.');
      window.addEventListener('deviceorientationabsolute', orientation);
      window.addEventListener('deviceorientation', orientation);
      window.addEventListener('orientationchange', screenChanged);
      window.screen?.orientation?.addEventListener('change', screenChanged);
      timer = setTimeout(() => stopSensor('Chưa nhận được hướng Bắc. Kiểm tra quyền cảm biến; nếu đang mở trong ứng dụng, thử mở trực tiếp bằng Safari/Chrome qua HTTPS.'), 8000);
    } catch {
      stopSensor('Không được truy cập cảm biến. Kiểm tra quyền chuyển động/hướng và mở trang trực tiếp qua HTTPS.');
    } finally { pending = false; $('sensor').disabled = false; }
  };
})();
