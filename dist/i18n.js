const solTranslations = [
  ['Chỉnh góc mái','Edit roof corners'],['Góc mái','Roof corner'],['Tấm pin vượt đường bao mái. Hãy di chuyển hoặc xếp lại pin.','Panels extend outside the roof. Move or rearrange them.'],
  ['Ẩn đường mặt trời','Hide sun path'],
  ['Hiện đường mặt trời','Show sun path'],
  ['Mặt phẳng sắp xếp pin, cửa chính ở phía dưới','Panel layout, front door at the bottom'],
  ['đã xét hướng nhà, mái và các vật cản trong mô phỏng.','accounts for the house bearing, roofs and obstacles in the simulation.'],
  ['Thêm vật cản','Add obstacles'],['+ Tấm pin','+ Panel'],['Xóa tấm','Delete panel'],['Xoay 90°','Rotate 90°'],
  ['Nhà chính · Cửa chính','Main house · Front door'],
  ['Thêm ăng-ten (3 m)','Add antenna (3 m)'],
  ['Ăng-ten','Antenna'],
  ['Diện tích pin bị che nắng','Shaded panel area'],
  ['Thêm cây lớn (10 m)','Add large tree (10 m)'],
  ['Thêm bồn nước (2 m)','Add water tank (2 m)'],
  ['Xóa vật cản','Remove obstacle'],
  ['Cây lớn','Large tree'],
  ['Bồn nước','Water tank'],
  ["Kích thước tấm pin", "Panel dimensions"],
  ["Gợi ý hệ thống theo nhu cầu", "System sizing by demand"],
  ["La bàn mặt trời", "Sun compass"],
  ["Mô phỏng hướng nắng", "Sun direction simulation"],
  ["Điều hướng", "Navigation"],
  ["Dùng múi giờ thiết bị", "Use device time zone"],
  ["Múi giờ mặc định theo thiết bị. Có thể chỉnh thủ công trong menu.", "The time zone defaults to your device. You can adjust it manually in the menu."],
  ["Ban ngày (kWh/ngày)", "Daytime use (kWh/day)"],
  ["Ban đêm (kWh/đêm)", "Nighttime use (kWh/night)"],
  ["Điều chỉnh giả định", "Adjust assumptions"],
  ["Công suất mỗi tấm PV (W)", "PV panel power (W)"],
  ["Sản lượng AC (kWh/kWp/ngày)", "AC yield (kWh/kWp/day)"],
  ["Tải dùng đồng thời cao nhất (kW, bỏ trống nếu chưa biết)", "Peak simultaneous load (kW, leave blank if unknown)"],
  ["Điện đêm cấp bằng pin (%)", "Nighttime demand supplied by battery (%)"],
  ["Chưa biết", "Unknown"],
  ["Tính hệ thống phù hợp", "Calculate system size"],
  ["Tấm PV", "PV panels"],
  ["Inverter · công suất AC", "Inverter · AC power"],
  ["Lưu trữ · danh định", "Storage · nominal capacity"],
  ["Công suất", "Power"],
  ["Dài × rộng", "Length × width"],
  ["Model / nguồn hãng", "Model / manufacturer source"],
  ["Nhập điện dùng mỗi ngày để ước tính PV, inverter và pin lưu trữ cho một đêm. Mục tiêu là đáp ứng năng lượng theo giả định, chưa tối ưu chi phí.", "Enter daily electricity use to estimate PV, inverter and storage for one night. This balances energy under the assumptions, without optimizing cost."],
  ["4 kWh/kWp/ngày là giả định minh họa đã gồm hao hụt PV → AC, không lấy từ dự báo hôm nay. Điều chỉnh theo vị trí, bóng che và mùa. Giả định lưu trữ: hiệu suất cả vòng 90%, xả ra tải 95%, dung lượng sử dụng 90%; tỷ lệ PV/inverter 1,2. Dung lượng pin hiển thị là danh định, làm tròn lên 1 kWh.", "4 kWh/kWp/day is an illustrative assumption including PV-to-AC losses, not today’s forecast. Adjust for location, shading and season. Storage assumptions: 90% round-trip efficiency, 95% discharge-to-load efficiency, 90% usable capacity; PV/inverter ratio 1.2. Displayed battery capacity is nominal, rounded up to 1 kWh."],
  ["Tham khảo cách định cỡ sơ bộ:", "Preliminary sizing reference:"],
  ["Các giả định trên có thể khác thiết bị thực tế.", "These assumptions may differ from actual equipment."],
  ["Đây là cân bằng năng lượng theo ngày, chưa kiểm tra diện tích mái, tải theo giờ hay chuỗi ngày ít nắng. Gợi ý không tự thay đổi bố trí đang mô phỏng.", "This is a daily energy balance, without checking roof area, hourly demand or consecutive low-sun days. Suggestions do not change the simulated layout."],
  ["Các mức công suất cách nhau 5 W. Cùng W có thể khác kích thước tùy hãng/model. Bảng được đối chiếu tài liệu hãng ngày 22/11/2026; kiểm tra model thực tế trước khi lắp. Kiểm tra bố trí dùng mặt bằng tấm chưa nghiêng để giữ giới hạn mái bảo thủ; chưa trừ lối đi bảo trì.", "Power ratings are spaced by 5 W. Dimensions at the same wattage vary by manufacturer/model. This table was checked against manufacturer documents on 22 November 2026; verify the actual model before installation. Layout checks conservatively use untilted panel footprints and exclude maintenance walkways."],
  ["PV cần tạo ", "PV must generate "],
  [" kWh/ngày, gồm điện ban ngày và điện sạc bù hao hụt. Cấu hình làm tròn tạo khoảng ", " kWh/day, including daytime use and charging losses. The rounded configuration generates approximately "],
  [" kWh/ngày theo giả định. Lưu trữ cấp ", " kWh/day under the assumptions. Storage supplies "],
  [" kWh cho ban đêm; còn ", " kWh at night; the remaining "],
  [" kWh/đêm lấy từ lưới theo mục tiêu đã chọn.", " kWh/night comes from the grid for the selected target."],
  ["Inverter sơ bộ đã xét tải đồng thời bạn nhập.", "The preliminary inverter size includes your simultaneous load."],
  ["Chưa có tải đồng thời: inverter chỉ được chọn sơ bộ theo PV; nhập kW tải đỉnh để kiểm tra thêm.", "No simultaneous load entered: inverter sizing is based on PV only; enter peak kW for a further check."],
  [" Cần đối chiếu công suất sạc/xả pin, giới hạn PV/MPPT và dòng khởi động của thiết bị.", " Check battery charge/discharge power, PV/MPPT limits and equipment starting current."],
  [" Gợi ý vượt 30 tấm, ngoài giới hạn mô phỏng mái hiện tại.", " This exceeds 30 panels, the current roof simulation limit."],
  ["Phương án ít vốn hơn: khoảng ", "Lower upfront cost option: approximately "],
  [" tấm cho ", " panels for "],
  [" kWh ban ngày, không lưu trữ và dùng lưới ban đêm. Chưa có giá thiết bị, giá điện và biểu đồ tải nên chưa kết luận phương án nào hoàn vốn tốt nhất.", " kWh of daytime use, without storage, using the grid at night. Without equipment costs, electricity tariffs and load profiles, the best payback option cannot be determined."],
  [" tấm · ", " panels · "],
  ["Vui lòng nhập đủ thông số hợp lệ.", "Please enter valid values for all required inputs."],
  ["Điện dùng phải lớn hơn 0; kiểm tra công suất tấm và sản lượng trên mỗi kWp.", "Electricity use must be greater than zero; check panel power and yield per kWp."],

  ['Số lượng tấm pin', 'Panel count'],
  ['Công suất mỗi tấm (W)', 'Power per panel (W)'],
  ['Tổng công suất (kWp)', 'Total capacity (kWp)'],
  ['Bảng kích thước tham chiếu 550–700 W', 'Reference module dimensions: 550–700 W'],
  ['Thông số hãng', 'Manufacturer datasheet'],
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
    "Hướng Nắng — La bàn mặt trời",
    "Hướng Nắng — Sun compass"
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
solTranslations.push(
  ["Lấy vị trí GPS hiện tại", "Get current GPS location"],
  ["Language / Ngôn ngữ", "Language"],
  ["Mô phỏng trong ngày", "Daily simulation"],
  ["Mô phỏng trong năm", "Annual simulation"],
  ["Bắc = 0°", "North = 0°"],
  ["Mô hình 3D nhà và tấm pin. Kéo hoặc dùng phím mũi tên để xoay góc nhìn.", "3D house and solar panel model. Drag or use arrow keys to rotate the view."],
  ["Đặt tấm pin", "Place panels"],
  ["Cài đặt mô phỏng", "Simulation settings"],
  ["Sao lưu profile", "Back up profile"],
  ["Tải mô phỏng", "Download simulation"],
  ["Khôi phục profile từ file", "Restore profile from file"],
  ["Nhập mô phỏng", "Import simulation"],
  ["Chọn file profile mô phỏng", "Choose a simulation profile file"],
  ["Điều chỉnh", "Adjust"],
  ["Nhà chính & mái", "Main house & roof"],
  ["Nhà bên trái / phải · 0–5 tầng", "Left / right neighbors · 0–5 floors"],
  ["Tấm pin & hướng tối ưu", "Panels & optimal orientation"],
  ["La bàn thiết bị", "Device compass"],
  ["Vị trí mô phỏng", "Simulation location"],
  ["Di chuyển trong trang tính toán", "Navigate the calculator"],
  ["↑ Xem mô phỏng", "↑ View simulation"],
  ["Tính điện ↓", "Calculate energy ↓"],
  ["Nhà chính", "Main house"],
  ["1 lầu", "1 upper floor"],
  ["Chiều dài nhà", "House length"],
  ["Chiều dài áp dụng cho thân nhà, mái và hai nhà bên.", "Length applies to the main house, roof and both neighbors."],
  ["Kiểu mái", "Roof type"],
  ["Mái bằng", "Flat roof"],
  ["Mái Thái", "Thai-style roof"],
  ["Mái Thái minh họa hai dốc, đỉnh cao 3 m. Pin đặt trên giàn vượt đỉnh mái; chưa mô phỏng lắp áp mái.", "The illustrated Thai-style roof has two slopes and a ridge 3 m higher. Panels sit on a frame above the ridge; flush mounting is not modeled."],
  ["Hướng cửa chính (hướng nhà)", "Front door direction (house bearing)"],
  ["0° · Bắc", "0° · North"],
  ["Xoay nhà sẽ xoay cả pin và hai nhà bên. Hướng pin luôn tính từ Bắc.", "Rotating the house also rotates its panels and both neighbors. Panel bearing is always measured from north."],
  ["Nhà hai bên", "Neighboring houses"],
  ["Trái / phải khi đứng trong nhà nhìn ra cửa chính. 0 = không có nhà; tối đa 5 tầng gồm tầng trệt.", "Left / right as seen from inside the house looking out the front door. 0 = no house; up to 5 floors including the ground floor."],
  ["Nhà bên trái", "Left neighbor"],
  ["Không có", "None"],
  ["+ 1 tầng bên trái", "+ 1 floor on the left"],
  ["Mái nhà bên trái", "Left neighbor roof"],
  ["Mái Thái · đỉnh cao thêm 3 m", "Thai-style roof · ridge 3 m higher"],
  ["Nhà bên phải", "Right neighbor"],
  ["+ 1 tầng bên phải", "+ 1 floor on the right"],
  ["Mái nhà bên phải", "Right neighbor roof"],
  ["Nhà bên rộng 8 m, dài bằng nhà chính, áp sát hai bên; mỗi tầng cao 3,2 m.", "Neighbors are 8 m wide, as long as the main house, and directly adjacent; each floor is 3.2 m high."],
  ["Tấm pin trên mái", "Rooftop panels"],
  ["Số tấm năng lượng mặt trời", "Number of solar panels"],
  ["6 tấm", "6 panels"],
  ["Sắp xếp từng tấm pin", "Arrange individual panels"],
  ["+ Thêm tấm pin", "+ Add panel"],
  ["− Bớt tấm pin", "− Remove panel"],
  ["Kích thước từng tấm theo mức W đã chọn trong phần cấu hình điện. Kéo thả từng tấm trên mặt phẳng bố trí, tối đa 30 tấm. Số tấm trên mái tự cập nhật tổng công suất hệ thống.", "Panel dimensions follow the wattage selected in the energy settings. Drag panels in the layout editor, up to 30 panels. The rooftop panel count automatically updates system capacity."],
  ["Bắc 0°", "North 0°"],
  ["Đông 90°", "East 90°"],
  ["Tây 270°", "West 270°"],
  ["Độ nghiêng so với mặt phẳng ngang", "Tilt above horizontal"],
  ["Gợi ý góc pin theo mô phỏng hôm nay", "Suggest panel angles for today's simulation"],
  ["Gợi ý góc pin theo mô phỏng cả năm", "Suggest panel angles for the annual simulation"],
  ["Chọn ngày và vị trí để so sánh mức đón nắng.", "Choose a date and location to compare sunlight capture."],
  ["Thu nhỏ", "Zoom out"],
  ["Phóng to", "Zoom in"],
  ["Mặt trước", "Front view"],
  ["Kéo để xoay · Cuộn / chụm để zoom · Phím + −", "Drag to rotate · Scroll / pinch to zoom · + − keys"],
  ["Vì sao bố trí tấm pin như vậy?", "Why this panel layout?"],
  ["Bật la bàn thiết bị để cảnh xoay theo điện thoại.", "Enable the device compass to rotate the scene with your phone."],
  ["Diện tích pin bị nhà bên che", "Panel area shaded by neighbors"],
  ["Cách đọc mô phỏng", "How to read the simulation"],
  ["Các tấm pin được bố trí riêng trong cửa sổ sắp xếp và dựng lại đúng vị trí trên giàn 3D. Cửa hai cánh đánh dấu hướng nhà. Màu sáng thể hiện mức đón tia nắng; bóng đổ và phần pin bị nhà bên che được mô phỏng hình học. Vòng cung mặt trời được vẽ trên lớp riêng để luôn nhìn rõ. Tỷ lệ đón nắng = cos góc tới × phần diện tích không bị nhà bên che (gồm cả mái Thái), không phải hiệu suất hay sản lượng điện. Gợi ý theo quỹ đạo ngày hoặc năm, xét vị trí pin, hướng nhà và bóng che nhà bên gồm mái Thái; giữ nguyên tâm từng tấm. Chưa xét mây, bóng che giữa các tấm hay kết cấu chịu lực. Dự báo kWh dùng cùng hình học mái, nhà bên và vị trí từng tấm để trừ bóng che trực tiếp; bức xạ thời tiết lấy theo hướng/nghiêng pin. Tỷ lệ che tức thời khác trung bình theo giờ. Mái sáng không chứng minh mặt pin nhận nắng.", "Panels are arranged individually in the layout editor and reproduced in the same positions on the 3D frame. The double door marks the house direction. Brightness indicates direct sunlight capture; building shadows and shaded panel areas are modeled geometrically. The sun arc is drawn on a separate layer to remain visible. Sunlight capture = cosine of the incidence angle × the unshaded fraction (including Thai-style roofs), not efficiency or energy yield. Daily or annual suggestions account for panel position, house bearing and neighboring shadows while preserving panel centers. Clouds, shading between panels and structural capacity are not modeled. The kWh forecast uses the same roof, neighbor and panel geometry to subtract direct-beam shading; weather irradiance follows panel bearing and tilt. Instantaneous shading differs from hourly averages. A bright roof does not prove the panels receive sunlight."],
  ["Bạn muốn bố trí tấm pin thế nào?", "How would you like to arrange the panels?"],
  ["Xếp thẳng theo nhóm MPPT", "Straight rows by MPPT group"],
  ["Hàng song song mép mái, gom các tấm cùng MPPT gần nhau. Đổi hướng pin theo hướng nhà, giữ độ nghiêng.", "Rows parallel to the roof edge, with panels on the same MPPT grouped together. Align panel bearing with the house and keep the current tilt."],
  ["Dùng phương án gợi ý tối ưu", "Use the optimized suggestion"],
  ["So sánh hướng và độ nghiêng theo nắng, xét bóng nhà bên. Với gợi ý bố trí cả năm, tìm thêm vị trí từng tấm.", "Compare bearing and tilt for sunlight, including neighbor shadows. Annual layout suggestions also search for individual panel positions."],
  ["Prototype bố trí theo kWh/năm", "Annual energy layout prototype"],
  ["Kịch bản giả định, không phải dữ liệu khí hậu. Giữ hướng/nghiêng pin; chia bức xạ theo quỹ đạo nắng, tỷ trọng trực tiếp/tán xạ giả định 80/20 trước chiếu lên mặt pin.", "An assumed scenario, not climate data. Keeps panel bearing and tilt; distributes irradiance along the sun path with an assumed 80/20 direct/diffuse split before projection onto the panel plane."],
  ["Bức xạ trên mặt pin (kWh/m²/năm)", "Plane-of-array irradiation (kWh/m²/year)"],
  ["Khoảng cách giữa tấm (m)", "Panel spacing (m)"],
  ["So sánh bố trí theo năm", "Compare annual layouts"],
  ["Hủy", "Cancel"],
  ["So sánh trước khi áp dụng", "Compare before applying"],
  ["Đề xuất", "Proposed"],
  ["Áp dụng đề xuất", "Apply suggestion"],
  ["Giữ bố trí hiện tại", "Keep current layout"],
  ["Chưa biết lắp hệ nào? Gợi ý theo nhu cầu", "Not sure what to install? Size a system by demand"],
  ["Cấu hình cơ bản", "Basic settings"],
  ["Nhập thông số trên nhãn hoặc tài liệu inverter của bạn.", "Enter specifications from your inverter label or documentation."],
  ["Giới hạn PV DC lắp đặt (kWp)", "Maximum installed PV DC capacity (kWp)"],
  ["Công suất AC là mức điện tối đa inverter xuất ra. Giới hạn PV DC là tổng công suất tấm pin tối đa inverter cho phép kết nối.", "AC power is the maximum output of the inverter. The PV DC limit is the total panel capacity the inverter allows you to connect."],
  ["Cấu hình nâng cao", "Advanced settings"],
  ["Hiệu suất · Hao hụt · MPPT", "Efficiency · Losses · MPPT"],
  ["Các giá trị bên dưới vẫn được dùng khi thu gọn. Nếu chưa chỉnh, ứng dụng dùng giả định mặc định; nếu đã lưu cấu hình, các giá trị của bạn được giữ lại.", "These values remain active when collapsed. Unchanged settings use the application defaults; previously saved values are retained."],
  ["Hiệu suất chuyển đổi", "Conversion efficiency"],
  ["Hiệu suất DC → AC (%)", "DC → AC efficiency (%)"],
  ["Hao hụt riêng", "Individual losses"],
  ["Nhiệt độ (%)", "Temperature (%)"],
  ["Dây dẫn DC (%)", "DC wiring (%)"],
  ["Bụi bẩn (%)", "Soiling (%)"],
  ["Hao hụt khác (%)", "Other losses (%)"],
  ["Giới hạn MPPT", "MPPT limits"],
  ["MPPT là bộ theo dõi điểm công suất tối đa của nhóm tấm pin. Chỉnh các giới hạn theo tài liệu inverter.", "MPPT tracks the maximum power point of a panel group. Set these limits from the inverter documentation."],
  ["Số MPPT", "MPPT count"],
  ["Điện áp MPPT tối thiểu (V)", "Minimum MPPT voltage (V)"],
  ["Điện áp MPPT tối đa (V)", "Maximum MPPT voltage (V)"],
  ["Dòng tối đa mỗi MPPT (A)", "Maximum current per MPPT (A)"],
  ["Điện áp vận hành giả định (V)", "Assumed operating voltage (V)"],
  ["Nhiệt độ, dây dẫn, bụi và hao hụt khác được áp dụng riêng, mỗi loại một lần. Hiệu suất inverter áp dụng ở bước DC → AC. Không nhập lại các hao hụt này vào mục “khác”. Giá trị nhiệt độ là giả định phần trăm, chưa phải mô hình nhiệt theo thời tiết.", "Temperature, wiring, soiling and other losses are applied separately, once each. Inverter efficiency is applied at the DC → AC stage. Do not enter these losses again under “other”. Temperature loss is an assumed percentage, not a weather-based thermal model."],
  ["MPPT: phân tấm lần lượt đều vào các tracker, cùng điện áp vận hành giả định; giới hạn dòng tính từ P/V. Đây chưa phải thiết kế chuỗi nối tiếp/song song hay kiểm tra Voc/Isc. Hybrid hiện chỉ dự báo nhánh PV → AC, chưa mô phỏng sạc/xả pin lưu trữ.", "MPPT: panels are assigned evenly in rotation to trackers at the same assumed operating voltage; current limits use P/V. This is not a series/parallel string design or a Voc/Isc check. Hybrid mode currently forecasts only the PV → AC path, without battery charging/discharging."],
  ["· Kích thước tham chiếu theo model, không phải trung bình của mọi tấm cùng công suất.", "· Reference dimensions are model-specific, not averages of all panels with the same wattage."],
  ["Xem bảng kích thước tấm pin", "View panel dimensions"],
  ["Dự báo sản lượng điện", "Energy yield forecast"],
  ["Sau bóng che và hao hụt DC", "After shading and DC losses"],
  ["Sau inverter và clipping", "After inverter and AC clipping"],
  ["Công suất trung bình theo giờ · kW", "Hourly average power · kW"],
  ["Chọn khoảng giờ để xem chi tiết", "Select an hourly interval for details"],
  ["Phân tích tổn thất", "Loss analysis"],
  ["Hạng mục", "Category"],
  ["% DC ban đầu", "% of initial DC"],
  ["Chi tiết từng giờ và từng tấm", "Details by hour and panel"],
  ["Dự báo AC đã xét bóng che trực tiếp từng tấm, hao hụt riêng, giới hạn MPPT và clipping inverter. Bóng che lấy mẫu 36 ô/tấm, mỗi 15 phút; vẫn giữ phần bức xạ tán xạ. Chưa xét che bầu trời khuếch tán, bóng giữa các tấm, bypass diode/mismatch chuỗi, pin lưu trữ hay giới hạn phát lên lưới.", "The AC forecast includes direct shading per panel, individual losses, MPPT limits and inverter clipping. Shading is sampled at 36 cells per panel every 15 minutes; diffuse irradiance is retained. Diffuse sky obstruction, shading between panels, bypass diodes/string mismatch, battery storage and grid export limits are not modeled."],
  ["Kịch bản bức xạ năm không hợp lệ.", "Invalid annual irradiation scenario."],
  ["Không có bức xạ trong tập ngày đại diện.", "No irradiation in the representative-day sample."],
  ["Khoảng cách/lưới ứng viên không hợp lệ.", "Invalid spacing or candidate grid."],
  ["Kịch bản bức xạ không khớp hướng/nghiêng.", "Irradiation scenario does not match panel bearing/tilt."],
  ["Chưa tìm được bố trí đủ số tấm và khoảng cách yêu cầu. Giảm khoảng cách hoặc tăng kích thước mái.", "No layout fits the requested panel count and spacing. Reduce spacing or increase roof dimensions."],
  ["Không lưu được mô phỏng trên trình duyệt này. Cấu hình hiện tại chỉ giữ đến khi đóng trang.", "Cannot save the simulation in this browser. Current settings will only last until the page is closed."],
  ["tấm ×", "panels ×"],
  ["kWp · Dài", "kWp · Length"],
  ["× rộng", "× width"],
  ["Đã đặt", "Placed"],
  ["tấm · Bố trí tự động tìm được chỗ cho", "panels · Automatic layout found room for"],
  ["tấm trên mái", "panels on a roof of"],
  ["m. Có thể sắp xếp thủ công; chỉ nhận vị trí không chồng lấn, không vượt mái, tối đa 30 tấm.", "m. Manual arrangement is available; positions must not overlap or extend beyond the roof, with a maximum of 30 panels."],
  ["Không xếp được", "Cannot fit"],
  ["tấm: bố trí tự động hiện tìm được", "panels: the automatic layout currently fits"],
  ["m, với tấm", "m, with panels measuring"],
  ["m và hướng tương đối", "m and relative bearing"],
  ["°. Đã giữ", "°. Kept"],
  ["tấm để không chồng lấn hoặc vượt mái. Hãy tăng chiều rộng/dài nhà, đổi hướng hoặc sắp xếp thủ công.", "panels to avoid overlaps or roof overhang. Increase the house width/length, change bearing or arrange panels manually."],
  ["tấm", "panels"],
  ["lầu + tầng trệt", "upper floors + ground floor"],
  ["tầng ·", "floors ·"],
  ["Thông số tấm pin đã đổi. Bấm tính để cập nhật sản lượng.", "Panel specifications changed. Calculate again to update the yield."],
  ["Đã xếp lại pin để phù hợp kích thước hoặc hướng mới. Mở Sắp xếp từng tấm pin để chỉnh.", "Panels were rearranged to fit the new dimensions or bearing. Open Arrange individual panels to adjust."],
  ["Cấu hình đã thay đổi. Hãy tạo đề xuất mới.", "Settings changed. Generate a new suggestion."],
  ["Đang đánh giá kịch bản bức xạ năm…", "Evaluating the annual irradiation scenario…"],
  ["Cần vị trí trước khi đánh giá năm.", "Set a location before evaluating the year."],
  ["Đang xếp hạng", "Ranking"],
  ["vị trí…", "positions…"],
  ["Kịch bản", "Scenario"],
  ["kWh/m²/năm trên mặt pin, không phải dự báo thời tiết năm. Hiện tại: AC", "kWh/m²/year on the panel plane, not an annual weather forecast. Current: AC"],
  ["kWh/năm, tổn thất bóng che", "kWh/year, shading loss"],
  ["kWh DC. Đề xuất: AC", "kWh DC. Proposed: AC"],
  ["kWh DC. Chênh lệch AC", "kWh DC. AC difference"],
  ["kWh/năm. Khoảng cách tối thiểu", "kWh/year. Minimum spacing"],
  ["m. Giữ hướng/nghiêng hiện tại; 12 ngày đại diện, lưới ứng viên 1 m.", "m. Keeps current bearing/tilt; 12 representative days, 1 m candidate grid."],
  ["Đã áp dụng bố trí từ kịch bản năm sau khi xác nhận. Bấm tính để cập nhật dự báo hôm nay.", "Applied the confirmed annual scenario layout. Calculate again to update today's forecast."],
  ["Xếp hạng vị trí (10 vị trí đầu /", "Position ranking (top 10 /"],
  ["kWh DC/năm của một tấm trước MPPT/inverter. % là năng lượng mất do bóng che / DC ban đầu, không phải diện tích che tức thời.", "kWh DC/year per panel before MPPT/inverter. % is energy lost to shading / initial DC, not instantaneous shaded area."],
  ["Vị trí x, z (m)", "Position x, z (m)"],
  ["DC kWh/năm", "DC kWh/year"],
  ["Mất do che", "Shading loss"],
  ["Cần GPS hoặc nhập tọa độ trước khi gợi ý.", "Use GPS or enter coordinates before requesting a suggestion."],
  ["Đang so sánh góc pin theo vị trí từng tấm, hướng nhà và bóng che nhà bên…", "Comparing panel angles using individual positions, house bearing and neighbor shadows…"],
  ["Mô phỏng đã thay đổi. Bấm gợi ý để tính lại theo cấu hình mới.", "The simulation changed. Request another suggestion for the new settings."],
  ["Không tìm thấy ánh nắng trực tiếp đến pin trong khoảng mô phỏng này. Kiểm tra bóng che hoặc vị trí.", "No direct sunlight reaches the panels during this simulation interval. Check shadows or location."],
  [": hướng", ": bearing"],
  ["°, nghiêng", "°, tilt"],
  ["°. Chỉ số đón nắng", "°. Sunlight capture index"],
  ["(điểm hình học, không phải kWh). Bố trí hiện tại chưa thay đổi.", "(geometric score, not kWh). The current layout has not changed."],
  ["Đã áp dụng gợi ý theo mô phỏng. Bấm tính để cập nhật sản lượng.", "Applied the simulation suggestion. Calculate again to update the yield."],
  ["Chỉ số đón nắng hình học tăng khoảng", "Geometric sunlight capture index increased by approximately"],
  ["% so với cấu hình trước.", "% compared with the previous settings."],
  ["Đã áp dụng gợi ý", "Applied suggestion for"],
  ["° từ Bắc, nghiêng", "° from north, tilt"],
  ["đã xét hướng nhà và bóng che nhà bên, gồm mái Thái.", "accounts for house bearing and neighbor shadows, including Thai-style roofs."],
  ["Bước thời gian 30 phút, tìm góc thô rồi tinh chỉnh 5°, kiểm tra 36 ô/tấm. Đây là ước tính hình học, chưa xét thời tiết hoặc bóng che giữa các tấm; không phải mức tăng kWh.", "30-minute time steps, coarse angle search followed by 5° refinement, 36 samples per panel. This is a geometric estimate excluding weather and inter-panel shading, not a kWh increase."],
  ["từ mức không đón được nắng trực tiếp", "from no direct sunlight capture"],
  ["Với mái", "For a roof of"],
  ["m và", "m and"],
  ["tấm, phương án chọn hướng", "panels, the selected bearing is"],
  ["° và nghiêng", "° and tilt is"],
  ["° vì đạt chỉ số đón nắng tốt nhất trong các phương án đã thử", "° because it achieved the highest sunlight capture index among the tested options"],
  ["Không tính được gợi ý. Bố trí hiện tại được giữ nguyên; hãy thử lại.", "Unable to calculate a suggestion. The current layout is unchanged; please try again."],
  ["Chỉ xếp được", "Only fits"],
  ["tấm thành hàng. Hãy tăng kích thước mái hoặc chọn gợi ý tối ưu.", "panels in rows. Increase the roof dimensions or choose the optimized suggestion."],
  ["Xếp", "Arrange"],
  ["tấm thẳng theo", "panels in straight rows across"],
  ["nhóm MPPT. Đổi hướng pin thành", "MPPT groups. Set panel bearing to"],
  ["°, giữ nghiêng", "°, keep tilt at"],
  ["°. Bấm Áp dụng nếu đồng ý.", "°. Select Apply to confirm."],
  ["Đã xếp", "Arranged"],
  ["tấm thành hàng song song mép mái, hướng pin", "panels in rows parallel to the roof edge, panel bearing"],
  ["°, giữ độ nghiêng", "°, keeping tilt at"],
  ["Đã xếp hàng theo nhóm MPPT. Bấm tính sản lượng để cập nhật dự báo.", "Panels arranged by MPPT group. Calculate energy yield to update the forecast."],
  ["Tọa độ đã chọn", "Selected coordinates"],
  ["Đang dùng tọa độ nhập thủ công. Bấm để lấy GPS.", "Using manually entered coordinates. Click to get GPS location."],
  ["Không có ánh sáng ban ngày", "No daylight"],
  ["Mặt trời không lặn · 00:00 — 23:59", "Sun does not set · 00:00 — 23:59"],
  ["Mọc", "Sunrise"],
  ["— Lặn", "— Sunset"],
  ["Gợi ý áp dụng cho ngày và vị trí đang chọn. Bấm gợi ý để tính lại.", "Suggestions apply to the selected date and location. Request a suggestion to recalculate."],
  ["Bấm Theo la bàn thiết bị để bật; xem trạng thái ở nhóm La bàn thiết bị.", "Select Follow device compass to enable it; check the Device compass settings for status."],
  ["3D đang xoay bằng tay. Hướng nhà không đổi khi xoay góc nhìn.", "3D view is rotating manually. Rotating the view does not change house bearing."],
  ["BẮC · 0°", "NORTH · 0°"],
  ["ĐÔNG · 90°", "EAST · 90°"],
  ["TÂY · 270°", "WEST · 270°"],
  ["Dưới chân trời", "Below the horizon"],
  ["Chờ vị trí", "Waiting for location"],
  ["Quay khỏi nắng", "Facing away from sunlight"],
  ["Lặn", "Sunset"],
  ["Trình duyệt không hỗ trợ canvas. Bạn vẫn có thể chỉnh thông số và tính sản lượng.", "This browser does not support canvas. You can still adjust settings and calculate energy yield."],
  ["Vị trí mô phỏng đã lưu", "Saved simulation location"],
  ["Đã khôi phục vị trí và cấu hình mô phỏng trên trình duyệt này.", "Restored the simulation location and settings saved in this browser."],
  ["Đang dùng vị trí đã lưu. Bấm để lấy GPS hiện tại.", "Using the saved location. Click to get current GPS location."],
  ["Có thể chỉnh tọa độ trong cài đặt hoặc dùng GPS để cập nhật vị trí.", "Edit coordinates in settings or use GPS to update the location."],
  ["Dùng vị trí hiện tại", "Use current location"],
  ["Đã tạo file sao lưu profile. Bạn có thể dùng file này để khôi phục trên thiết bị khác.", "Profile backup file created. Use this file to restore the profile on another device."],
  ["Không tạo được bản sao lưu.", "Unable to create a backup."],
  ["Đang đọc profile…", "Reading profile…"],
  ["File sao lưu vượt giới hạn 64 KB.", "Backup file exceeds the 64 KB limit."],
  ["Đã khôi phục profile. Bấm tính để cập nhật sản lượng.", "Profile restored. Calculate again to update the yield."],
  ["Đã khôi phục mô phỏng. Bấm gợi ý để tính góc pin cho profile này.", "Simulation restored. Request a suggestion to calculate panel angles for this profile."],
  ["Đã khôi phục profile và cập nhật mô hình 3D.", "Profile restored and 3D model updated."],
  ["Đã áp dụng vị trí trong file.", "Applied the location from the file."],
  ["File không có vị trí; giữ vị trí đang dùng.", "No location in the file; keeping the current location."],
  ["Không khôi phục được profile.", "Unable to restore the profile."],
  ["Đang lấy vị trí GPS…", "Getting GPS location…"],
  ["Đã lấy GPS hiện tại. Bấm để cập nhật vị trí.", "Current GPS location acquired. Click to update."],
  ["Sắp xếp tấm pin", "Arrange panels"],
  ["Kéo từng tấm trên mặt phẳng mái. Chọn tấm rồi dùng phím mũi tên để dịch 10 cm. Dùng nút xoay hoặc phím R để đổi ngang/dọc tấm đang chọn. Hướng đón nắng và độ nghiêng giữ theo cài đặt chung. Pin không được chồng nhau hoặc vượt mép mái.", "Drag each panel on the roof plane. Select a panel and use arrow keys to move it by 10 cm. Use Rotate or the R key to switch the selected panel between portrait and landscape. Sun-facing bearing and tilt follow the shared settings. Panels must not overlap or extend beyond the roof."],
  ["Thêm tấm", "Add panel"],
  ["Xóa tấm đã chọn", "Delete selected panel"],
  ["Xoay tấm 90°", "Rotate panel 90°"],
  ["Xếp tự động", "Auto arrange"],
  ["Áp dụng lên 3D", "Apply to 3D"],
  ["CỬA CHÍNH · HƯỚNG NHÀ", "FRONT DOOR · HOUSE BEARING"],
  ["Tấm pin", "Panel"],
  ["Xoay tấm", "Rotate panel"],
  ["Vị trí này chồng lên tấm khác hoặc vượt mép mái.", "This position overlaps another panel or extends beyond the roof."],
  ["tấm · Tấm", "panels · Panel"],
  ["m, dọc", "m, lengthwise"],
  ["Không thể xoay ở đây: tấm pin sẽ chồng lên tấm khác hoặc vượt mép mái. Hãy dịch tấm ra chỗ trống rồi xoay.", "Cannot rotate here: the panel would overlap another panel or extend beyond the roof. Move it to an empty area first."],
  ["Đã xoay tấm", "Rotated panel"],
  ["90°. Bấm Áp dụng lên 3D để lưu.", "90°. Select Apply to 3D to save."],
  ["Không còn vị trí trống. Hãy di chuyển các tấm hoặc xếp tự động.", "No free position available. Move the panels or use Auto arrange."],
  ["Đã xếp tự động.", "Panels arranged automatically."],
  ["Bố trí chưa hợp lệ.", "Invalid layout."],
  ["tấm · Mái rộng", "panels · Roof width"],
  ["m × dài", "m × length"],
  ["m. Tấm", "m. Panel"],
  ["m; 3D áp dụng thêm độ nghiêng đã chọn.", "m; the 3D view also applies the selected tilt."],
  ["Cho phép vị trí để xem hướng nắng tại nơi bạn đang đứng.", "Allow location access to see sun directions where you are."],
  ["La bàn tính toán hướng nắng trên trình duyệt. Thời tiết và điện mặt trời nằm ở trang tính toán riêng.", "The compass calculates sun directions in your browser. Weather and solar energy estimates are on a separate calculator page."],
  ["Hướng Nắng — Tính toán & bố trí pin mặt trời", "Hướng Nắng — Solar planner"],
  ["Cấu hình & tính sản lượng", "Settings & energy forecast"],
  ["Cấu hình đã đổi. Bấm Tính sản lượng hôm nay để cập nhật.", "Settings changed. Select Calculate today's yield to update."],
  ["· Giảm dự phòng", "· Planning reserve reduction"],
  ["% · Gốc", "% · Original"],
  ["kWh → trừ bóng che", "kWh → minus shading"],
  ["→ hao hụt DC", "→ DC losses"],
  ["→ DC còn", "→ remaining DC"],
  ["kWh → MPPT mất", "kWh → MPPT loss"],
  ["→ chuyển đổi mất", "→ conversion loss"],
  [", dây dẫn", ", wiring"],
  [", bụi", ", soiling"],
  [", khác", ", other"],
  ["kWh. Hiệu suất inverter", "kWh. Inverter efficiency"],
  ["· Kết thúc khoảng", "· Interval ending"],
  ["giờ · DC", "hours · DC"],
  ["Tấm", "Panel"],
  ["Diện tích có nắng TB", "Average sunlit area"],
  ["AC phân bổ kWh", "Allocated AC kWh"],
  ["Profile không hợp lệ hoặc có thông số ngoài giới hạn.", "Invalid profile or out-of-range settings."],
  ["Vị trí pin vượt mép mái.", "Panel position extends beyond the roof."],
  ["File không phải JSON hợp lệ.", "File is not valid JSON."],
  ["File không đúng định dạng profile Sol hoặc phiên bản chưa hỗ trợ.", "File is not a valid Sol profile or uses an unsupported version."],
  ["Geometry không hợp lệ.", "Invalid geometry."],
  ["Bố trí pin không hợp lệ.", "Invalid panel layout."],
  ["Góc mặt trời không hợp lệ.", "Invalid sun angle."],
  ["Lưới bóng che không hợp lệ.", "Invalid shading grid."],
  ["Thiếu cấu hình inverter/hao hụt.", "Missing inverter/loss settings."],
  ["Hao hụt không hợp lệ.", "Invalid losses."],
  ["Thông số inverter không hợp lệ.", "Invalid inverter settings."],
  ["Giới hạn MPPT/hiệu suất không hợp lệ.", "Invalid MPPT limits or efficiency."],
  ["Thiếu hình học mô phỏng.", "Missing simulation geometry."],
  ["Công suất PV DC vượt giới hạn tiếp nhận của inverter.", "PV DC capacity exceeds the inverter input limit."],
  ["Thiếu bức xạ trực tiếp DNI theo giờ.", "Missing hourly direct normal irradiance (DNI)."],
  ["giờ", "hours"],
  ["phút", "minutes"],
  ["Tháng", "Month"],
  ["năm", "year"],
  ["Cập nhật cuối:", "Last updated:"],
  ["UTC · Tọa độ", "UTC · Coordinates"]
);
solTranslations.push(
  ["Nam 180°", "South 180°"],
  ["NAM · 180°", "SOUTH · 180°"],
  ["Đóng bố trí", "Close layout editor"],
  ["Ngang", "Landscape"],
  ["Dọc", "Portrait"],
  ["Giữ vị trí các tấm vì chưa tìm thấy cách dịch chuyển tốt hơn.", "Panel positions are unchanged because no better placement was found."],
  ["Mô hình hiện tại không có nhà bên gây bóng che; lựa chọn chủ yếu dựa vào hướng và độ nghiêng.", "There are no shading neighbors in the current model; the choice is mainly based on bearing and tilt."],
  ["Chưa tìm được phương án có chỉ số cao hơn cấu hình hiện tại.", "No option with a higher score than the current configuration was found."],
  ["Các tấm được giữ trong mép mái và không chồng nhau. Đây là so sánh hình học, không phải mức tăng điện năng; chưa tính thời tiết, bóng giữa các tấm và lối đi bảo trì.", "Panels stay within the roof edges without overlapping. This is a geometric comparison, not an energy increase; weather, inter-panel shading and maintenance walkways are excluded."],
  ["Đã tự xếp từng tấm trên mái, so sánh bố trí gom cụm và rời rạc để tránh bóng che; áp dụng phương án tốt nhất tìm được.", "Panels were automatically arranged by comparing clustered and dispersed layouts to avoid shadows; the best layout found was applied."],
  ["Giữ vị trí từng tấm;", "Keeping individual panel positions;"],
  ["Lấy mẫu 12 ngày giữa tháng, gia quyền theo số ngày từng tháng;", "Sampled 12 mid-month days, weighted by the number of days in each month;"],
  ["qua 12 ngày đại diện cho các tháng trong năm", "across 12 representative days for the months of the year"],
  ["trong ngày đang chọn", "on the selected day"],
  ["Đã chuyển", "Moved"],
  [" tấm để sử dụng các vùng mái thuận lợi hơn.", " panels to use more favorable roof areas."],
  ["Phần đón nắng bị nhà bên che (có gia quyền theo góc nắng) thay đổi từ", "Sunlight blocked by neighbors (weighted by incidence angle) changed from"],
  ["% thành", "% to"],
  ["Chỉ số đón nắng tăng", "Sunlight capture increased by"],
  ["°. Các nhóm MPPT nằm liền nhau theo thứ tự hàng:", "°. MPPT groups are adjacent in row order:"],
  ["Cách xếp ưu tiên hàng thẳng và gom nhóm, không tối ưu sản lượng theo nắng. Nhóm này dùng trong mô hình dự báo, chưa phải thiết kế đấu chuỗi điện.", "This layout prioritizes straight rows and grouping, not maximum solar yield. Groups are used in the forecast model; this is not an electrical string design."],
  ["Ngày", "Date"],
  ["ngày", "day"],
  ["DC lý tưởng", "Ideal DC"],
  ["Nhiệt độ", "Temperature"],
  ["DC trước tổn thất", "DC before losses"],
  ["Bóng che", "Shading"],
  ["Dây dẫn DC", "DC wiring"],
  ["Bụi bẩn", "Soiling"],
  ["Khác", "Other"],
  ["Chuyển đổi inverter", "Inverter conversion"],
  ["AC đầu ra", "AC output"],
  ["Công suất DC và AC trung bình trong từng khoảng giờ, chi tiết qua thanh chọn bên dưới", "Average DC and AC power for each hourly interval; use the slider below for details"],
  ["Hôm nay", "Today"],
  ["kWh · hệ", "kWh · system"],
  ["Lấy dữ liệu lúc", "Data fetched at"],
  ["Dữ liệu lúc", "Data timestamp"],
  ["ô thời tiết ~2 km", "weather grid ~2 km"],
  ["Yêu cầu quá thời gian", "Request timed out"],
  ["Vị trí chưa sẵn sàng.", "Location is not ready."]
);
solTranslations.push(
  ["Bắc", "North"],
  ["Đông Bắc", "Northeast"],
  ["Đông", "East"],
  ["Đông Nam", "Southeast"],
  ["Nam", "South"],
  ["Tây Nam", "Southwest"],
  ["Tây", "West"],
  ["Tây Bắc", "Northwest"],
  ["Bố trí trên mái", "Roof layout"],
  ["Mặt phẳng sắp xếp pin, cửa chính ở phía trên", "Panel layout plane, with the front door at the top"]
);
solTranslations.push(['Bố trí tự động tìm được chỗ cho', 'Automatic layout found room for']);
(() => {
  const pageTitle = document.title;
  let language = 'vi';
  try { if (localStorage.getItem('sol-language') === 'en') language = 'en'; } catch {}
  const dictionary = new Map(solTranslations.map(([vi,en]) => [vi.trim(),en.trim()]));
  const escape = text => Array.from(text, char => '.*+?^${}()|[]'.includes(char) || char.charCodeAt(0) === 92 ? String.fromCharCode(92) + char : char).join('');
  const pattern = new RegExp([...dictionary.keys()].sort((a,b) => b.length-a.length).map(escape).join('|'), 'g');
  const wordCharacter = /[\p{L}\p{N}_]/u;
  const compassWords = { B: 'N', ĐB: 'NE', Đ: 'E', ĐN: 'SE', N: 'S', TN: 'SW', T: 'W', TB: 'NW', MỌC: 'RISE', LẶN: 'SET', Bắc: 'North', Đông: 'East', Nam: 'South', Tây: 'West', Mọc: 'Rise', Lặn: 'Set', Bạn: 'You' };
  function translate(text) {
    if (language !== 'en') return text;
    if (compassWords[text]) return compassWords[text];
    return text.replace(pattern, (match, index, source) => {
      // Do not translate a short Vietnamese word embedded in an English word.
      if ((wordCharacter.test(match[0]) && index > 0 && wordCharacter.test(source[index-1])) ||
          (wordCharacter.test(match.at(-1)) && index+match.length < source.length && wordCharacter.test(source[index+match.length]))) return match;
      return dictionary.get(match);
    })
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
    for (const name of ['aria-label', 'aria-valuetext', 'title', 'placeholder', 'alt']) {
      if (!element.hasAttribute(name)) continue;
      const current = element.getAttribute(name);
      if (!saved[name] || saved[name].rendered !== current) saved[name] = { source: current };
      saved[name].rendered = translate(saved[name].source);
      if (current !== saved[name].rendered) element.setAttribute(name, saved[name].rendered);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { updateText(root); return; }
    if (root.nodeType !== 1 || ['SCRIPT','STYLE'].includes(root.tagName) || (root.hasAttribute('translate') && root.getAttribute('translate') === 'no')) return;
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
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label','aria-valuetext','title','placeholder','alt'] });
  }
  function apply() {
    observer.disconnect();
    document.documentElement.lang = language;
    document.title = globalThis.isSolarCalculator ? (language === 'en' ? 'Hướng Nắng — Solar planner' : 'Hướng Nắng — Tính toán & bố trí pin mặt trời') : translate(pageTitle);
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
