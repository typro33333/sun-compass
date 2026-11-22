const solTranslations = [
  ['Chiều rộng nhà', 'House width'],
  ['Mỗi tầng cao 3,2 m.', 'Each floor is 3.2 m tall.'],
  ['Cài đặt', 'Settings'],
  ['Cài đặt hiển thị', 'Display settings'],
  ['Gợi ý bố trí pin cho cả năm', 'Suggest panel layout for the year'],
  ['MÔ PHỎNG TRONG NĂM', 'YEAR SIMULATION'],
  ['Chạy cả năm', 'Play year'],
  ['Giữ giờ đang chọn', 'Keep selected time'],
  ['Ngày mô phỏng trong năm', 'Simulation day of year'],
  ['Cấu hình công suất, tấm pin, tọa độ và múi giờ sẽ được lưu trên trình duyệt này khi bạn bấm tính.', 'Power, panel, location and time zone settings are saved in this browser when you calculate.'],
  ['Đã lưu cấu hình trên trình duyệt này. Lần mở sau tự tải dự báo mới cho hôm nay.', 'Settings saved in this browser. A fresh forecast will load on your next visit.'],
  ['Trình duyệt không cho lưu cấu hình. Vẫn tính được nhưng lần mở sau cần nhập lại.', 'This browser cannot save settings. You can still calculate, but will need to enter them again next time.'],
  ['Cho phép vị trí để xem hướng nắng, thời tiết và dự đoán điện mặt trời tại nơi bạn đang đứng.', 'Allow location access to see sun directions, weather and solar energy estimates where you are.'],
  ['Tọa độ được gửi đến máy chủ để lấy dự báo thời tiết theo khu vực khoảng 2 km.', 'Coordinates are sent to the server to fetch weather forecasts for an area of approximately 2 km.'],
  ['Bấm Dùng vị trí của tôi để bắt đầu.', 'Select Use my location to get started.'],
  [
    "Sol — La bàn mặt trời",
    "Sol — Sun compass"
  ],
  [
    "LA BÀN MẶT TRỜI",
    "SUN COMPASS"
  ],
  [
    "Dự đoán điện mặt trời",
    "Solar energy forecast"
  ],
  [
    "Chế độ sáng",
    "Light mode"
  ],
  [
    "Chế độ tối",
    "Dark mode"
  ],
  [
    "GÓC NHÌN TỪ NƠI BẠN ĐỨNG",
    "THE VIEW FROM WHERE YOU STAND"
  ],
  [
    "Đi theo ánh nắng.",
    "Follow the sunlight."
  ],
  [
    "Biết mặt trời ở đâu. Chọn khoảnh khắc của bạn.",
    "Find the sun. Pick your moment."
  ],
  [
    "Dùng vị trí của tôi",
    "Use my location"
  ],
  [
    "MÔ PHỎNG TRONG NGÀY",
    "EXPLORE THE DAY"
  ],
  [
    "Nắng ban ngày",
    "Daylight"
  ],
  [
    "Phương vị",
    "Azimuth"
  ],
  [
    "Độ cao",
    "Elevation"
  ],
  [
    "Hiện tại",
    "Now"
  ],
  [
    "Tự chạy",
    "Play"
  ],
  [
    "Tạm dừng",
    "Pause"
  ],
  [
    "Thời gian mô phỏng trong ngày",
    "Time of day to simulate"
  ],
  [
    "Xem / sửa hệ thống",
    "View / edit system"
  ],
  [
    "LA BÀN & QUỸ ĐẠO",
    "COMPASS & SUN PATH"
  ],
  [
    "TP. Hồ Chí Minh",
    "Ho Chi Minh City"
  ],
  [
    "Vị trí mẫu",
    "Sample location"
  ],
  [
    "Ban ngày",
    "Daytime"
  ],
  [
    "Ban đêm",
    "Nighttime"
  ],
  [
    "Chế độ xem hướng nắng",
    "Sun view mode"
  ],
  [
    "La bàn 2D",
    "2D compass"
  ],
  [
    "Không gian 3D",
    "3D view"
  ],
  [
    "Không gian hướng nắng 3D. Kéo hoặc dùng phím mũi tên để xoay góc nhìn.",
    "3D sun view. Drag or use arrow keys to rotate the camera."
  ],
  [
    "Xoay trái",
    "Rotate left"
  ],
  [
    "Xoay phải",
    "Rotate right"
  ],
  [
    "Đặt lại góc nhìn",
    "Reset view"
  ],
  [
    "Kéo để xoay · Phím mũi tên để đổi góc nhìn. Mặt phẳng là đường chân trời, đường vàng là quỹ đạo mặt trời. Góc nhìn 3D độc lập cảm biến la bàn; không biểu diễn thời tiết.",
    "Drag to rotate · Use arrow keys to change the view. The plane is the horizon; the gold line is the sun path. The 3D camera is independent of the compass sensor and does not show weather."
  ],
  [
    "La bàn hiển thị phương vị mặt trời",
    "Compass showing the sun's azimuth"
  ],
  [
    "VỊ TRÍ CỦA BẠN",
    "YOUR LOCATION"
  ],
  [
    "Bắc cố định",
    "North fixed"
  ],
  [
    "Bật la bàn thiết bị",
    "Enable device compass"
  ],
  [
    "Bắc đang cố định. Bấm bật la bàn để bản đồ xoay theo điện thoại; giữ máy nằm phẳng.",
    "North is fixed. Enable the compass to rotate the view with your phone; hold it flat."
  ],
  [
    "Mặt trời hiện tại",
    "Sun at selected time"
  ],
  [
    "Mặt trời mọc",
    "Sunrise"
  ],
  [
    "Mặt trời lặn",
    "Sunset"
  ],
  [
    "Quỹ đạo trong ngày",
    "Daily sun path"
  ],
  [
    "Trong la bàn 2D, chấm vàng càng gần tâm nghĩa là gì?",
    "What does the gold dot being closer to the center mean in 2D?"
  ],
  [
    "Đó là mặt trời càng cao trên bầu trời, không phải gần bạn hơn. Vành ngoài ≈ 0° (đường chân trời), giữa bán kính ≈ 45°, tâm = 90° (ngay trên đỉnh đầu). Hướng từ tâm tới chấm là hướng bạn nhìn về mặt trời. Chấm xám ở vành ngoài nghĩa là mặt trời đã xuống dưới đường chân trời.",
    "The sun is higher in the sky, not physically closer to you. The outer ring is about 0° (the horizon), halfway inward is about 45°, and the center is 90° (directly overhead). Look from the center toward the dot to find the sun. A gray dot on the rim means the sun is below the horizon."
  ],
  [
    "NGÀY THÁNG",
    "DATE"
  ],
  [
    "Ngày khám phá",
    "Explore a date"
  ],
  [
    "Khám phá theo tháng",
    "Explore by month"
  ],
  [
    "Tháng mô phỏng",
    "Month to simulate"
  ],
  [
    "Tháng ",
    "Month "
  ],
  [
    "Vĩ độ",
    "Latitude"
  ],
  [
    "Kinh độ",
    "Longitude"
  ],
  [
    "Múi giờ UTC",
    "UTC offset"
  ],
  [
    "Chọn vị trí của bạn hoặc nhập tọa độ để khám phá.",
    "Use your location or enter coordinates to explore."
  ],
  [
    "Thời gian có ánh sáng",
    "Daylight duration"
  ],
  [
    "THỜI TIẾT HIỆN TẠI TẠI TỌA ĐỘ ĐÃ CHỌN",
    "CURRENT WEATHER AT THE SELECTED LOCATION"
  ],
  [
    "Đang tải thời tiết…",
    "Loading weather…"
  ],
  [
    "Mây:",
    "Clouds:"
  ],
  [
    "Mưa:",
    "Rain:"
  ],
  [
    "Cập nhật thời tiết",
    "Refresh weather"
  ],
  [
    "Dữ liệu hiện tại từ",
    "Current data from"
  ],
  [
    ", ước tính từ mô hình khí tượng. Không thay đổi theo thanh giờ/tháng. Lớp mây/mưa chỉ hiện trên la bàn khi xem gần thời điểm hiện tại.",
    ", estimated by weather models. It does not follow the time/month slider. Clouds and rain appear on the compass only near the current time."
  ],
  [
    "Được tạo cho những người yêu ánh sáng.",
    "Made for those who love the light."
  ],
  [
    "Tính toán gần đúng · Đường chân trời phẳng ·",
    "Approximate calculations · Flat horizon ·"
  ],
  [
    "Công thức NOAA",
    "NOAA equations"
  ],
  [
    "NĂNG LƯỢNG HÔM NAY",
    "TODAY'S SOLAR ENERGY"
  ],
  [
    "Đóng",
    "Close"
  ],
  [
    "Công suất tấm pin (kWp)",
    "Panel capacity (kWp)"
  ],
  [
    "Hao hụt tổng giả định (%)",
    "Assumed total losses (%)"
  ],
  [
    "Độ nghiêng tấm pin (°)",
    "Panel tilt (°)"
  ],
  [
    "Hướng tấm pin (° từ Bắc)",
    "Panel direction (° from north)"
  ],
  [
    "Hướng: Bắc 0° · Đông 90° · Nam 180° · Tây 270°. Mặc định nghiêng 15°, hướng Nam; hãy chỉnh theo mái thực tế.",
    "Directions: North 0° · East 90° · South 180° · West 270°. Defaults: 15° tilt, south-facing. Adjust to match your roof."
  ],
  [
    "Cấu hình công suất, tấm pin, tọa độ và múi giờ sẽ được lưu bằng cookie trên trình duyệt này trong 1 năm khi bạn bấm tính.",
    "Capacity, panel settings, coordinates and UTC offset are saved in a cookie on this browser for one year when you calculate."
  ],
  [
    "Tính sản lượng hôm nay",
    "Calculate today's energy"
  ],
  [
    "kWh dự kiến",
    "kWh estimated"
  ],
  [
    "Ước tính cả ngày từ dự báo bức xạ trên mặt phẳng tấm pin của",
    "Full-day estimate from plane-of-array irradiance forecasts by"
  ],
  [
    ", không phải số điện đã đo hoặc lượng điện còn lại từ bây giờ. Ngày hôm nay theo múi giờ đang chọn, độc lập với thanh mô phỏng.",
    ", not measured output or energy remaining from now. Today uses the selected UTC offset, independently of the simulation slider."
  ],
  [
    "Hao hụt gộp nhiệt độ, inverter, dây dẫn và bụi bẩn. Chưa mô hình hóa bóng che riêng, giới hạn công suất inverter, pin lưu trữ hay cắt giảm phát điện. Kết quả thực tế có thể khác khi thời tiết thay đổi.",
    "Losses combine temperature, inverter, wiring and soiling effects. Site-specific shading, inverter clipping, storage and curtailment are not modeled. Actual output may differ as weather changes."
  ],
  [
    "Dưới đường chân trời",
    "Below the horizon"
  ],
  [
    "Ánh nắng sát chân trời",
    "Sun near the horizon"
  ],
  [
    "Không xảy ra",
    "No event"
  ],
  [
    " giờ ",
    " h "
  ],
  [
    " phút",
    " min"
  ],
  [
    "Nhập vĩ độ −90 đến 90, kinh độ −180 đến 180 và UTC −12 đến +14.",
    "Enter latitude −90 to 90, longitude −180 to 180, and UTC offset −12 to +14."
  ],
  [
    "Vị trí tùy chọn",
    "Custom location"
  ],
  [
    "Đã cập nhật tọa độ. Thời gian được hiển thị theo múi giờ UTC đã chọn.",
    "Coordinates updated. Times use the selected UTC offset."
  ],
  [
    "Trình duyệt không hỗ trợ GPS. Hãy nhập tọa độ bên trên.",
    "This browser does not support GPS. Enter coordinates above."
  ],
  [
    "Đang lấy vị trí…",
    "Getting your location…"
  ],
  [
    "Vị trí hiện tại",
    "Current location"
  ],
  [
    " m. Múi giờ theo thiết bị; bạn có thể điều chỉnh.",
    " m. The UTC offset follows your device; you can adjust it."
  ],
  [
    "Chưa được cấp quyền vị trí. Bạn có thể cho phép GPS hoặc nhập tọa độ thủ công.",
    "Location permission is missing. Allow GPS or enter coordinates manually."
  ],
  [
    "Không lấy được vị trí. Hãy thử lại hoặc nhập tọa độ thủ công.",
    "Could not get your location. Try again or enter coordinates manually."
  ],
  [
    "Trời quang",
    "Clear sky"
  ],
  [
    "Ít mây",
    "Few clouds"
  ],
  [
    "Nhiều mây",
    "Mostly cloudy"
  ],
  [
    "U ám",
    "Overcast"
  ],
  [
    "Có mưa",
    "Rain"
  ],
  [
    "Không mưa",
    "No rain"
  ],
  [
    "% mây",
    "% cloud cover"
  ],
  [
    "Dữ liệu lúc ",
    "Data at "
  ],
  [
    "Tọa độ ",
    "Coordinates "
  ],
  [
    "Đã cập nhật dữ liệu thời tiết hiện tại.",
    "Current weather updated."
  ],
  [
    "Không lấy được thời tiết mới. Kiểm tra kết nối và bấm cập nhật; chưa xác định được mây hoặc mưa.",
    "Could not load fresh weather. Check your connection and refresh; cloud and rain conditions are unknown."
  ],
  [
    "Nhập thông số hệ thống để dự đoán tổng điện năng hôm nay.",
    "Enter your system settings to estimate today's total energy."
  ],
  [
    "Đã lưu cấu hình trên trình duyệt này trong 1 năm. Lần mở sau tự tải dự báo mới cho hôm nay.",
    "Profile saved in this browser for one year. Fresh forecasts for today will load on your next visit."
  ],
  [
    "Trình duyệt không cho lưu cookie. Vẫn tính được nhưng lần mở sau cần nhập lại.",
    "Cookies are blocked. You can calculate now, but will need to enter your settings next visit."
  ],
  [
    "Đang dự đoán sản lượng hôm nay…",
    "Estimating today's energy…"
  ],
  [
    "Đang lấy dự báo bức xạ theo giờ hôm nay…",
    "Loading today's hourly irradiance forecast…"
  ],
  [
    "Không tải được dự báo. Hãy kiểm tra mạng và thử lại.",
    "Could not load the forecast. Check your connection and try again."
  ],
  [
    "Đơn vị bức xạ không hợp lệ.",
    "Invalid irradiance units."
  ],
  [
    "Tổng cả ngày ",
    "Full day "
  ],
  [
    " · hệ ",
    " · system "
  ],
  [
    " giờ nắng tương đương",
    " equivalent sun hours"
  ],
  [
    "Tấm pin nghiêng ",
    "Panel tilt "
  ],
  [
    "°, hướng ",
    "°, direction "
  ],
  [
    "° (Bắc = 0°). Hao hụt giả định ",
    "° (north = 0°). Assumed losses "
  ],
  [
    "%. Lấy dữ liệu lúc ",
    "%. Data fetched at "
  ],
  [
    "Đã tính theo dự báo bức xạ có xét điều kiện mây của mô hình thời tiết.",
    "Calculated using irradiance forecasts that account for cloud conditions in the weather model."
  ],
  [
    "Hôm nay ",
    "Today "
  ],
  [
    ": khoảng ",
    ": about "
  ],
  [
    " · dự báo, không phải số điện đã đo",
    " · forecast, not measured energy"
  ],
  [
    "Chưa tải được dự báo điện hôm nay. Mở hệ thống để thử lại.",
    "Today's energy forecast is unavailable. Open system settings to retry."
  ],
  [
    "Yêu cầu quá thời gian. Hãy thử lại.",
    "Request timed out. Please try again."
  ],
  [
    "Vị trí hệ thống đã lưu",
    "Saved system location"
  ],
  [
    "Đã khôi phục tọa độ hệ điện mặt trời. Bạn có thể đổi vị trí hoặc dùng GPS.",
    "Solar system coordinates restored. You can change the location or use GPS."
  ],
  [
    "Đã đọc cấu hình lưu trên trình duyệt. Đang dùng dự báo mới cho hôm nay.",
    "Saved browser profile restored. Using a fresh forecast for today."
  ],
  [
    "Thông số hệ thống không hợp lệ.",
    "Invalid system parameters."
  ],
  [
    "Thiếu dữ liệu bức xạ.",
    "Missing irradiance data."
  ],
  [
    "Mốc thời gian không hợp lệ.",
    "Invalid timestamps."
  ],
  [
    "Dữ liệu bức xạ hôm nay chưa đầy đủ.",
    "Today's irradiance data is incomplete."
  ],
  [
    "Chưa có đủ dữ liệu cho cả ngày. Hãy thử cập nhật lại.",
    "Full-day data is incomplete. Please refresh."
  ],
  [
    "Chỉ nhận được chuyển động tương đối, chưa xác định được hướng Bắc. Hãy mở bằng Safari/Chrome và cho phép cảm biến.",
    "Only relative motion is available; north is unknown. Open in Safari/Chrome and allow sensor access."
  ],
  [
    "Cảm biến chưa hiệu chỉnh. Đưa máy xa kim loại và di chuyển nhẹ theo hình số 8.",
    "The compass needs calibration. Move away from metal and gently move the phone in a figure eight."
  ],
  [
    "Tắt la bàn",
    "Disable compass"
  ],
  [
    "Đã nhận cảm biến. Hãy giữ máy nằm phẳng để đọc hướng chính xác hơn.",
    "Sensor connected. Hold your phone flat for a more accurate heading."
  ],
  [
    "La bàn đang hoạt động · Xoay máy nằm phẳng để thấy các hướng đổi theo bạn.",
    "Compass active · Rotate your phone while holding it flat to update the directions."
  ],
  [
    "Cảm biến đã ngừng gửi dữ liệu. Bấm bật lại; nếu vẫn lỗi, mở trang trực tiếp bằng Safari/Chrome.",
    "Sensor updates stopped. Enable it again; if it still fails, open the page directly in Safari/Chrome."
  ],
  [
    "Đã tắt cảm biến. La bàn trở về Bắc cố định.",
    "Sensor disabled. The compass is now north-fixed."
  ],
  [
    "Cảm biến cần HTTPS. Địa chỉ http://192.168… trên điện thoại không dùng được la bàn; hãy mở bản HTTPS.",
    "Sensors require HTTPS. An http://192.168… address on your phone cannot use the compass; open an HTTPS version."
  ],
  [
    "Trình duyệt không cung cấp cảm biến hướng. Thử mở trực tiếp bằng Safari trên iPhone hoặc Chrome trên Android.",
    "Orientation sensors are unavailable. Try opening directly in Safari on iPhone or Chrome on Android."
  ],
  [
    "Quyền chuyển động/hướng đã bị từ chối. Cho phép quyền cảm biến trong cài đặt trang rồi bấm bật lại.",
    "Motion/orientation permission was denied. Allow sensors in site settings, then enable the compass again."
  ],
  [
    "Hủy / tắt la bàn",
    "Cancel / disable compass"
  ],
  [
    "Đang chờ cảm biến hướng Bắc… Giữ điện thoại nằm phẳng.",
    "Waiting for a north heading… Hold your phone flat."
  ],
  [
    "Chưa nhận được hướng Bắc. Kiểm tra quyền cảm biến; nếu đang mở trong ứng dụng, thử mở trực tiếp bằng Safari/Chrome qua HTTPS.",
    "No north heading received. Check sensor permissions. If using an in-app browser, open directly in Safari/Chrome over HTTPS."
  ],
  [
    "Không được truy cập cảm biến. Kiểm tra quyền chuyển động/hướng và mở trang trực tiếp qua HTTPS.",
    "Sensor access failed. Check motion/orientation permissions and open the page directly over HTTPS."
  ],
  [
    "Trình duyệt không hỗ trợ canvas",
    "Canvas is not supported by this browser"
  ]
];
solTranslations.push(
  ['Mở menu', 'Open menu'],
  ['Đang xin quyền vị trí…', 'Requesting location permission…'],
  ['Thử lại GPS', 'Retry GPS'],
  ['Đang chờ vị trí', 'Waiting for location'],
  ['Vị trí được lấy tự động từ GPS.', 'Location is obtained automatically using GPS.'],
  ['Cần cấp quyền GPS trước khi dự đoán điện mặt trời.', 'Allow GPS access before calculating solar energy.'],
  ['Vui lòng cấp quyền vị trí để xem hướng nắng và dự báo tại nơi bạn đang đứng.', 'Allow location access to see the sun and forecast at your location.'],
  ['GPS cần HTTPS. Hãy mở ứng dụng bằng địa chỉ HTTPS.', 'GPS requires HTTPS. Open the app using an HTTPS address.'],
  ['Trình duyệt không hỗ trợ GPS. Hãy mở bằng Safari hoặc Chrome.', 'GPS is unavailable. Open the app in Safari or Chrome.'],
  ['Quyền vị trí bị từ chối. Bật quyền vị trí trong cài đặt trang rồi bấm Thử lại GPS.', 'Location permission was denied. Enable location in site settings, then select Retry GPS.'],
  ['Không lấy được GPS. Kiểm tra dịch vụ vị trí và kết nối, rồi thử lại.', 'Could not obtain GPS. Check location services and your connection, then retry.'],
  ['Đã lấy vị trí hiện tại', 'Current location acquired']
);
solTranslations.push(
 ['Dùng dự phòng thận trọng cho mây/mưa', 'Apply a conservative cloud/rain reserve'],
 ['Thiếu dự báo mây/mưa; giữ sản lượng gốc', 'Cloud/rain forecast unavailable; using the original estimate'],
 ['Không có bức xạ tạo điện', 'No energy-producing irradiance'],
 ['Giảm dự phòng ', 'Planning reserve '],
 ['Gốc ', 'Original '],
 [' (mẫu, hãy chỉnh công suất)', ' (sample; set your capacity)'],
 ['Bức xạ đã tính ảnh hưởng mây. Giảm thêm là biên dự phòng do ứng dụng đặt, không phải hệ số suy giảm đã được hiệu chuẩn: mây trên 50% giảm thêm tuyến tính đến 15%; mưa từ 0 đến 2 mm/giờ giảm thêm đến 10%. Tính theo từng giờ và gia quyền theo sản lượng, tối đa 25%. Có thể tắt để xem dự báo gốc.', 'Irradiance already accounts for clouds. This extra reduction is an app-defined planning reserve, not a calibrated loss model: cloud cover above 50% adds up to 15%; rain from 0 to 2 mm/hour adds up to 10%. Applied hourly and weighted by energy, capped at 25%. Turn it off to see the original forecast.']
);
solTranslations.push(
 ['Đang dùng dữ liệu đã lưu do dịch vụ thời tiết tạm lỗi.', 'Using cached data while the weather service is unavailable.'],
 ['Dữ liệu lưu tạm', 'Cached fallback data'],
 ['ô thời tiết ~2 km', '~2 km weather grid'],
 ['Ô thời tiết ~2 km.', '~2 km weather grid.']
);
solTranslations.push(
 ['Theo la bàn thiết bị', 'Follow device compass'],
 ['3D đang xoay theo la bàn thiết bị.', '3D is following the device compass.'],
 ['3D sẽ xoay theo điện thoại khi bật la bàn.', 'Enable the compass to rotate the 3D view with your phone.'],
 ['3D đang xoay bằng tay.', '3D is in manual rotation mode.'],
 ['Bật la bàn để 3D xoay theo điện thoại. Kéo hoặc dùng phím mũi tên để chuyển sang xoay tay; bấm Theo la bàn thiết bị để theo dõi lại. Giữ điện thoại nằm phẳng. Mặt phẳng là đường chân trời; cảnh không biểu diễn thời tiết.', 'Enable the compass to rotate 3D with your phone. Drag or use arrow keys for manual rotation; select Follow device compass to resume. Hold your phone flat. The plane is the horizon; the scene does not show weather.']
);
solTranslations.push(
 ['Đã tắt cảm biến. Giữ nguyên hướng la bàn vừa xem.', 'Sensor off. Keeping the last compass heading.'],
 ['Giữ hướng', 'Heading held'],
 ['Múi giờ theo thiết bị; bạn có thể điều chỉnh.', 'The UTC offset follows your device; you can adjust it.']
);
solTranslations.push(['Mặc định UTC+7. Có thể chỉnh múi giờ trong menu.', 'Default UTC+7. Adjust the UTC offset in the menu.']);
solTranslations.push(
 ['Tính toán điện mặt trời ↗', 'Solar calculator ↗'],
 ['← Về la bàn', '← Back to compass'],
 ['Đặt pin. Đón trọn nắng.', 'Place panels. Follow the sunlight.'],
 ['Bố trí trên mái, khám phá ánh sáng và dự đoán điện năng trong một không gian riêng.', 'Plan your roof, explore sunlight and estimate energy in one dedicated space.'],
 ['THIẾT KẾ HỆ PIN • 3D', '3D SOLAR PLANNER'],
 ['Mái nhà của bạn, theo hướng nắng.', 'Your roof, oriented to the sun.'],
 ['Đón nắng trực tiếp', 'Direct sunlight capture'],
 ['Góc tia nắng với pháp tuyến', 'Angle to panel normal'],
 ['Số lầu trên tầng trệt', 'Floors above ground floor'],
 ['+ Thêm 1 lầu', '+ Add one floor'],
 ['Chỉ tầng trệt', 'Ground floor only'],
 [' lầu + tầng trệt', ' floors + ground floor'],
 ['Mỗi tầng cao 3,2 m · mái phẳng 8 × 10 m.', '3.2 m per floor · flat roof 8 × 10 m.'],
 ['Hướng mặt tấm pin', 'Panel bearing'],
 ['Độ nghiêng so với mái', 'Tilt above the roof'],
 ['Dịch trên mái: trái ↔ phải (m)', 'Roof position: left ↔ right (m)'],
 ['Dịch trên mái: sau ↔ trước (m)', 'Roof position: back ↔ front (m)'],
 ['Gợi ý hướng & góc nghiêng ngày này', 'Suggest bearing & tilt for this day'],
 ['Kéo để xoay · ↑ ↓ ← →', 'Drag to rotate · ↑ ↓ ← →'],
 ['Thông số đã đổi. Bấm tính để cập nhật sản lượng.', 'Settings changed. Calculate again to update the estimate.'],
 ['Đang sử dụng tọa độ nhập thủ công.', 'Using manually entered coordinates.']
);
(() => {
  let language = 'vi';
  try { if (localStorage.getItem('sol-language') === 'en') language = 'en'; } catch {}
  const dictionary = new Map(solTranslations);
  const escape = text => Array.from(text, char => '.*+?^${}()|[]'.includes(char) || char.charCodeAt(0) === 92 ? String.fromCharCode(92) + char : char).join('');
  const pattern = new RegExp([...dictionary.keys()].sort((a,b) => b.length-a.length).map(escape).join('|'), 'g');
  const compassWords = { B: 'N', ĐB: 'NE', Đ: 'E', ĐN: 'SE', N: 'S', TN: 'SW', T: 'W', TB: 'NW', MỌC: 'RISE', LẶN: 'SET', Bắc: 'North', Đông: 'East', Nam: 'South', Tây: 'West', Mọc: 'Rise', Lặn: 'Set', Bạn: 'You' };
  function translate(text) {
    if (language !== 'en') return text;
    if (compassWords[text]) return compassWords[text];
    return text.replace(pattern, match => dictionary.get(match))
      .replace(/(°\s+)(ĐB|ĐN|TN|TB|B|Đ|N|T)(?=\s|$)/g, (_, prefix, direction) => prefix + compassWords[direction])
      .replace(/ năm (?=\d{4})/g, ' year ');
  }
  globalThis.solText = translate;
  globalThis.solLocale = () => language === 'en' ? 'en-US' : 'vi-VN';
  const originals = new WeakMap();
  function updateText(node) {
    const current = node.nodeValue;
    let saved = originals.get(node);
    if (!saved || current !== saved.rendered) saved = { source: current };
    saved.rendered = translate(saved.source);
    originals.set(node, saved);
    if (current !== saved.rendered) node.nodeValue = saved.rendered;
  }
  const attributes = new WeakMap();
  function updateAttributes(element) {
    let saved = attributes.get(element);
    if (!saved) { saved = {}; attributes.set(element, saved); }
    for (const name of ['aria-label', 'aria-valuetext', 'title']) {
      if (!element.hasAttribute(name)) continue;
      const current = element.getAttribute(name);
      if (!saved[name] || saved[name].rendered !== current) saved[name] = { source: current };
      saved[name].rendered = translate(saved[name].source);
      if (current !== saved[name].rendered) element.setAttribute(name, saved[name].rendered);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { updateText(root); return; }
    if (root.nodeType !== 1 || ['SCRIPT','STYLE','OPTION'].includes(root.tagName)) return;
    updateAttributes(root);
    for (const child of root.childNodes) walk(child);
  }
  const observer = new MutationObserver(records => {
    observer.disconnect();
    for (const record of records) {
      if (record.type === 'characterData') updateText(record.target);
      else if (record.type === 'attributes') updateAttributes(record.target);
      else for (const node of record.addedNodes) walk(node);
    }
    observe();
  });
  function observe() {
    if (language !== 'en') return;
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label','aria-valuetext','title'] });
  }
  function apply() {
    observer.disconnect();
    document.documentElement.lang = language;
    document.title = globalThis.isSolarCalculator ? (language === 'en' ? 'Sol — Solar planner' : 'Sol — Tính toán & bố trí pin mặt trời') : (language === 'en' ? 'Sol — Sun compass' : 'Sol — La bàn mặt trời');
    walk(document.body);
    document.getElementById('language-select').value = language;
    observe();
    globalThis.renderSolarScene?.();
    globalThis.renderPanelPlanner?.();
  }
  document.getElementById('language-select').addEventListener('change', event => {
    language = event.target.value === 'en' ? 'en' : 'vi';
    try { localStorage.setItem('sol-language', language); } catch {}
    apply();
  });
  apply();
})();
