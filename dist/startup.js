(() => {
  const toggle = $('header-menu-toggle'), actions = $('header-actions');
  function closeMenu(restoreFocus = false) {
    actions.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    const open = actions.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', event => {
    if (!actions.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  $('energy-open').addEventListener('click', () => closeMenu());
  const mobile = window.matchMedia('(max-width: 800px)');
  function arrangeMobile() {
    closeMenu();
    if (globalThis.isSolarCalculator) return;
    const main = document.querySelector('main');
    const energy = $('energy-preview');
    const timeline = document.querySelector('.timeline-card');
    const location = $('location-notice');
    const dateControls = $('date-controls');
    const compassCard = document.querySelector('.compass-card');
    const settings = document.querySelector('.settings-card');
    const workspace = document.querySelector('.workspace');
    if (mobile.matches) {
      main.prepend(location, energy);
      timeline.prepend(dateControls);
      compassCard.insertBefore(timeline, document.querySelector('.view-switch'));
    } else {
      settings.insertBefore(dateControls, document.querySelector('.coordinates'));
      main.insertBefore(timeline, workspace);
      main.insertBefore(energy, workspace);
    }
  }
  mobile.addEventListener('change', arrangeMobile);
  arrangeMobile();

  globalThis.setGPSStatus = (state, message) => {
    const icon=$('header-gps');
    icon.dataset.state=state;icon.title=message;
    icon.setAttribute('aria-label',message);
    icon.setAttribute('aria-busy',String(state==='pending'));
  };
  function failure(message) {
    setGPSStatus('error',message);
    $('location-status').textContent = message;
    $('location-retry').textContent = 'Thử lại GPS';
    $('feedback').textContent = message;
    $('location-retry').hidden = false;
    $('location-retry').disabled = false;
  }
  let gpsRequest=0;
  function locate() {
    const request=++gpsRequest;
    setGPSStatus('pending','Đang lấy vị trí GPS…');
    $('location-retry').hidden = true;
    $('location-status').textContent = 'Đang xin quyền vị trí…';
    $('feedback').textContent = 'Vui lòng cấp quyền vị trí để xem hướng nắng và dự báo tại nơi bạn đang đứng.';
    if (!window.isSecureContext) { failure('GPS cần HTTPS. Hãy mở ứng dụng bằng địa chỉ HTTPS.'); return; }
    if (!navigator.geolocation) { failure('Trình duyệt không hỗ trợ GPS. Hãy mở bằng Safari hoặc Chrome.'); return; }
    const plannerRevision=globalThis.plannerLocationRevision;
    navigator.geolocation.getCurrentPosition(position => {
      if(request!==gpsRequest || plannerRevision!==globalThis.plannerLocationRevision)return;
      lat = position.coords.latitude;
      lon = position.coords.longitude;
      $('lat').value = lat.toFixed(4);
      $('lon').value = lon.toFixed(4);
      $('timezone').value = offset;
      setCurrentTime();
      locationReady = true;
      setGPSStatus('success','Đã lấy GPS hiện tại. Bấm để cập nhật vị trí.');
      $('location-name').textContent = 'Vị trí hiện tại';
      $('location-status').textContent = 'Đã lấy vị trí hiện tại';
      $('feedback').textContent = 'Mặc định UTC+7. Có thể chỉnh múi giờ trong menu.';
      $('location-retry').hidden = true;
      refresh();
    }, error => {
      if(request!==gpsRequest || plannerRevision!==globalThis.plannerLocationRevision)return;
      failure(error.code === 1 ? 'Quyền vị trí bị từ chối. Bật quyền vị trí trong cài đặt trang rồi bấm Thử lại GPS.' : 'Không lấy được GPS. Kiểm tra dịch vụ vị trí và kết nối, rồi thử lại.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }
  $('location-retry').onclick = locate;
  $('header-gps').onclick = locate;
  if(!globalThis.restorePlannerLocation?.())locate();
})();
