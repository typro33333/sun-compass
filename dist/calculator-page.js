// Both server routes share solar/location controls; only the calculator requests forecasts.
globalThis.isSolarCalculator = /^\/sol-calculartor\/?$/.test(location.pathname || '/');
(() => {
  if (!globalThis.isSolarCalculator) {
    document.querySelector('.weather-card').hidden = true;
    document.getElementById('location-status').textContent = 'Cho phép vị trí để xem hướng nắng tại nơi bạn đang đứng.';
    document.getElementById('location-purpose').textContent = 'La bàn tính toán hướng nắng trên trình duyệt. Thời tiết và điện mặt trời nằm ở trang tính toán riêng.';
    return;
  }
  document.body.classList.add('calculator-page');
  document.title = 'Sol — Tính toán & bố trí pin mặt trời';
  document.querySelector('.intro h1').textContent = 'Đặt pin. Đón trọn nắng.';
  document.querySelector('.intro p').textContent = 'Bố trí trên mái, khám phá ánh sáng và dự đoán điện năng trong một không gian riêng.';
  const link = document.getElementById('energy-open');
  link.href = '/'; link.textContent = '← Về la bàn';
  document.querySelector('.compass-card').hidden = true;
  document.querySelector('.compass-help').hidden = true;
  const planner = document.getElementById('panel-planner');
  planner.hidden = false;
  document.getElementById('planner-jump-view').href = location.pathname + '#panel-canvas';
  document.getElementById('planner-jump-energy').href = location.pathname + '#energy-dialog';
  document.getElementById('planner-device').append(document.querySelector('.compass-mode'), document.getElementById('sensor-status'));
  document.getElementById('planner-location').append(document.querySelector('.settings-card'));
  document.querySelector('.planner-viewport').append(document.querySelector('.timeline-card'));
  document.querySelector('.timeline-card').prepend(document.getElementById('date-controls'));
  const dialog = document.getElementById('energy-dialog');
  const section = document.createElement('section');
  section.id = dialog.id; section.className = 'calculator-energy';
  section.setAttribute('aria-labelledby', 'energy-title');
  while (dialog.firstChild) section.append(dialog.firstChild);
  dialog.replaceWith(section);
  document.querySelector('.workspace').prepend(section);
  section.insertBefore(document.getElementById('energy-preview'), document.getElementById('energy-form'));
  document.getElementById('energy-title').textContent = 'Cấu hình & tính sản lượng';
  document.querySelector('.coordinates').hidden = false;
})();
