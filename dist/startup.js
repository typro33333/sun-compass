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

  function failure(message) {
    $('location-status').textContent = message;
    $('feedback').textContent = message;
    $('location-retry').hidden = false;
    $('location-retry').disabled = false;
  }
  function locate() {
    $('location-retry').hidden = true;
    $('location-status').textContent = 'Đang xin quyền vị trí…';
    $('feedback').textContent = 'Vui lòng cấp quyền vị trí để xem hướng nắng và dự báo tại nơi bạn đang đứng.';
    if (!window.isSecureContext) { failure('GPS cần HTTPS. Hãy mở ứng dụng bằng địa chỉ HTTPS.'); return; }
    if (!navigator.geolocation) { failure('Trình duyệt không hỗ trợ GPS. Hãy mở bằng Safari hoặc Chrome.'); return; }
    navigator.geolocation.getCurrentPosition(position => {
      lat = position.coords.latitude;
      lon = position.coords.longitude;
      offset = -new Date().getTimezoneOffset() / 60;
      $('lat').value = lat.toFixed(4);
      $('lon').value = lon.toFixed(4);
      $('timezone').value = offset;
      setCurrentTime();
      locationReady = true;
      $('location-name').textContent = 'Vị trí hiện tại';
      $('location-status').textContent = 'Đã lấy vị trí hiện tại';
      $('feedback').textContent = 'Múi giờ theo thiết bị; bạn có thể điều chỉnh.';
      $('location-retry').hidden = true;
      refresh();
    }, error => {
      failure(error.code === 1 ? 'Quyền vị trí bị từ chối. Bật quyền vị trí trong cài đặt trang rồi bấm Thử lại GPS.' : 'Không lấy được GPS. Kiểm tra dịch vụ vị trí và kết nối, rồi thử lại.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }
  $('location-retry').onclick = locate;
  locate();
})();
