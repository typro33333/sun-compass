# Hướng Nắng

Giao diện HTML, CSS và JavaScript với máy chủ Bun phục vụ file và API proxy có cache dùng chung. Cài Bun và Go 1.27, sau đó chạy `bun install`. `bun run start` chạy không theo dõi thay đổi; `PORT=8080 bun run dev` đổi cổng.

## Chạy cục bộ

```sh
cd sun-compass
bun run dev
```

Mở http://localhost:5173. GPS và cảm biến yêu cầu HTTPS hoặc localhost cùng quyền trình duyệt. Để thử trên điện thoại, chạy máy chủ Bun sau reverse proxy hoặc tunnel HTTPS. Chỉ upload `dist/` sẽ không đủ vì thời tiết và dự báo điện cần `/api/forecast`.

## Image và dịch vụ Docker

`Dockerfile.frontend` đóng gói giao diện và gateway Bun. `backend/Dockerfile` biên dịch bằng Go 1.27 và chỉ đưa binary tính toán vào image runtime. Chạy `docker compose -f deployments/compose.yaml up -d --build` để khởi động cả hai cùng Redis. Mô phỏng mái tải Three.js khi mở công cụ, dùng WebGPU trên thiết bị hỗ trợ, với WebGL 2 hoặc Canvas làm phương án dự phòng. Các lần xoay camera dùng lại buffer hình học. Service `calculator` tắt networking và phục vụ qua socket trên volume `calc-socket`. Gateway gắn volume ở chế độ chỉ đọc. Redis chỉ dùng mạng Compose.

## Kiến trúc tính toán

Trình duyệt giữ mô hình mái, thao tác kéo thả, cảm biến la bàn và biểu đồ. Bun phục vụ giao diện và nhận các yêu cầu JSON tại `/api/calc/*`. Trang gợi ý hệ thống hiển thị số liệu ban đầu từ server, sau đó cập nhật khi người dùng chỉnh biểu mẫu. Dữ liệu thời tiết đến từ proxy cùng origin.

Go thực hiện tính toán trong tiến trình riêng và lắng nghe trên Unix socket trong thư mục tạm riêng của ứng dụng. Binary `build/solar-calc` nằm ngoài thư mục tài nguyên web. Không cần mở thêm cổng. Gateway giới hạn kích thước yêu cầu, giới hạn số phép tính đồng thời và cache kết quả thành công trong Redis 15 phút theo hàm băm đầu vào. Khi sửa mã Go trong lúc chạy dev, khởi động lại `bun run dev` để biên dịch lại.

## Trang tính toán riêng

- `/`: trang giới thiệu và liên kết đến bốn công cụ.
- `/sun-compass`: la bàn và quỹ đạo mặt trời; không tải dự báo thời tiết/sản lượng.
- `/sol-calculator` (hỗ trợ cả dấu `/` cuối): dự báo điện và bố trí pin 3D (ẩn ngày khám phá và thời tiết hiện tại). Bấm **Mô phỏng hướng nắng** từ menu để chuyển trang.
- Trang tính toán chỉ hiển thị mô phỏng nhà; la bàn 2D/3D nằm tại `/sun-compass`. Trang chủ giới thiệu các công cụ của Hướng Nắng. Nút bật cảm biến nằm trong nhóm **La bàn thiết bị**. Nút **Theo la bàn thiết bị** trên mô hình nhà dùng chung cảm biến; kéo/phím mũi tên chuyển sang xoay tay. Thanh ngày/tháng đặt cạnh thanh thời gian, cập nhật đồng thời hai mô hình.
- Xoay mặt tiền nhà 0–360° sẽ xoay cả pin và hai nhà bên; hướng pin trong dự báo vẫn tính từ Bắc. Nhà trái/phải được xác định khi đứng trong nhà nhìn ra mặt tiền, chỉnh độc lập 0–5 tầng (0 để bỏ nhà), mỗi tầng 3,2 m, áp sát nhà chính (không có khoảng cách).
- Desktop đặt mô phỏng bên trái, nhóm điều chỉnh thu gọn bên phải; mobile xếp mô phỏng, thanh thời gian rồi các nhóm điều chỉnh. Cấu hình điện và kết quả nằm bên dưới mô phỏng. Khung 3D được thu gọn; vòng cung và mặt trời hiển thị trên lớp riêng để nhà cao không che khuất. Bóng che trên pin lấy mẫu 36 ô và dò tia tới mặt trời qua hai khối nhà bên, chưa trừ vào kWh dự báo.
- Mô hình mái phẳng 8 × 10 m, tầng trệt + 0–3 lầu, mỗi tầng 3,2 m. Thêm từng lầu, xoay góc nhìn bằng kéo/phím mũi tên, chỉnh hướng mặt pin 0–360°, nghiêng 0–90° và dịch cụm pin trên mái.
- Hướng/góc nghiêng được đồng bộ với biểu mẫu dự báo. Khi chỉnh thông số, kết quả cũ bị ẩn và yêu cầu đang chờ bị hủy; bấm tính để lấy dự báo mới.
- Chọn ngày/tháng và vị trí, kéo thanh thời gian hoặc phát từ bình minh tới hoàng hôn. Có thể nhập tọa độ thủ công nếu GPS bị từ chối. Các phép tính hình học vẫn chạy khi API thời tiết không khả dụng.
- Gợi ý góc lắp tìm trên lưới 5° theo quỹ đạo ngày đã chọn, lấy mẫu 10 phút, gia quyền góc tới theo sin độ cao mặt trời. Đây là gợi ý hình học trong ngày, chưa tối ưu sản lượng cả năm.
- 6 tấm là minh họa, không suy ra công suất kWp; công suất vẫn nhập riêng. Bóng đổ trên nền và tỷ lệ cos góc tới chỉ minh họa ánh sáng trực tiếp. Chỉ mô phỏng bóng che từ hai nhà bên; chưa mô hình hóa vật cản khác/dãy pin, kết cấu hay mái nghiêng. Độ cao nhà và dịch chuyển trên mái không thay đổi dự báo kWh.
- Dự báo điện/thời tiết vẫn áp dụng cho hôm nay, độc lập với ngày mô phỏng 3D. Không thêm thư viện hoặc dịch vụ 3D bên ngoài.

## Kiểm tra

```sh
bun run test
node --check dist/app.js
```

## Sử dụng

- Vị trí ban đầu là **mẫu TP. Hồ Chí Minh**, UTC+7.
- Chọn “Dùng vị trí của tôi” để lấy GPS; múi giờ được lấy từ thiết bị, có thể chỉnh thủ công.
- Chọn ngày, kéo thanh giờ hoặc bật “Tự chạy”.
- Kéo thanh tháng để cập nhật quỹ đạo, phương vị, giờ mọc/lặn theo tháng trong năm đã chọn. Ngày được giữ nguyên nếu hợp lệ, hoặc giới hạn ở cuối tháng.
- Thời tiết hiện tại lấy từ Open-Meteo theo tọa độ, gồm độ phủ mây và mưa. Tự cập nhật mỗi 10 phút khi trang đang hiển thị, có nút thử lại. Dữ liệu mô hình khí tượng không phải phép đo ngay tại chỗ.
- Thời tiết không đi theo ngày/tháng mô phỏng; lớp mây/mưa chỉ hiện khi giờ chọn cách hiện tại tối đa 30 phút trong cùng ngày. Lỗi mạng hoặc dữ liệu quá cũ sẽ không hiển thị hiệu ứng thời tiết.
- Bật la bàn thiết bị trên điện thoại và giữ máy nằm phẳng; nếu không có cảm biến hướng tuyệt đối, dùng chế độ Bắc cố định.
- Bán kính trên biểu đồ biểu thị độ cao: đường tròn ngoài là đường chân trời, tâm là thiên đỉnh. Khi mặt trời ở dưới chân trời, điểm màu xám nằm ở vành ngoài theo phương vị.

Tính toán gần đúng theo [NOAA](https://www.gml.noaa.gov/grad/solcalc/solareqns.PDF), ngưỡng mọc/lặn −0.833°. Không tính địa hình hay vật cản; cảm biến có thể bị nhiễu từ. Tọa độ được gửi tới API Open-Meteo để lấy thời tiết; dịch vụ Go tính bảng vị trí mặt trời cho ngày đã chọn. Giao diện dùng font hệ thống để tránh tải font bên ngoài.

`.openai/hosting.json` hiện vẫn là cấu hình hosting tĩnh cũ và chưa hỗ trợ API proxy mới. Muốn triển khai Sites phải chuyển sang server/Worker hoặc định tuyến `/api/forecast` về backend Bun trước; không xuất bản chỉ thư mục `dist/`.

## Dự đoán điện mặt trời

Nút trên header mở công cụ ước tính **kWh cả ngày hôm nay**, độc lập ngày mô phỏng. Nhập kWp (mặc định 11), độ nghiêng, phương vị tấm pin và phần trăm hao hụt tổng (mặc định 20%). Tọa độ và múi giờ lấy từ màn hình chính.

Dùng `global_tilted_irradiance` theo giờ từ Open-Meteo (W/m², trung bình giờ trước mốc thời gian). Cộng phần giao của mỗi giờ với ngày địa phương, đổi sang kWh/m² rồi tính `kWh = kWp × giờ nắng tương đương × (1 − hao hụt/100)`. Ví dụ minh họa: 11 kWp × 5 giờ × 0,8 = 44 kWh; đây không phải dự báo thực tế khi chưa tải dữ liệu.

Dự báo bức xạ đã phản ánh mây trong mô hình, không nhân thêm hệ số mây. Mô hình Go tính bóng che từng tấm, hao hụt DC, giới hạn MPPT và clipping inverter. Lỗi API hoặc thiếu giờ trả thông báo lỗi, không thay bằng dữ liệu giả. API nhận tọa độ và hướng/nghiêng tấm pin; không gửi công suất hệ thống.

## Cấu hình lưu trên trình duyệt

Khi bấm tính sản lượng, localStorage `sol_pv_profile` lưu kWp, hao hụt, độ nghiêng, hướng pin, tọa độ và múi giờ. Cookie cấu hình cũ được chuyển tự động khi mở trang và chỉ xóa sau khi lưu thành công. Cấu hình giữ đến khi người dùng xóa dữ liệu trình duyệt, không đồng bộ giữa thiết bị. Lần mở lại tải dự báo mới; nếu trình duyệt chặn lưu, ứng dụng báo lỗi và vẫn cho tính với cấu hình hiện tại.

## Góc nhìn 3D thử nghiệm

Chọn **Không gian 3D** phía trên la bàn. Kéo chuột hoặc một ngón tay để xoay, dùng phím mũi tên khi canvas có focus, hoặc dùng các nút xoay/đặt lại. Cảnh đồng bộ vị trí, ngày/tháng và thanh giờ; góc nhìn có thể theo cảm biến hướng thiết bị như la bàn 2D. Bật cảm biến qua nút dùng chung dưới cảnh. Kéo hoặc dùng nút/phím xoay chuyển sang chế độ thủ công; bấm **Theo la bàn thiết bị** để tiếp tục theo cảm biến. Mặt phẳng biểu diễn đường chân trời, đường vàng là quỹ đạo ban ngày, mặt trời màu xám nằm dưới chân trời. Không biểu diễn thời tiết trong cảnh 3D. Module dùng phép chiếu không gian trên Canvas, không cần thư viện hay tải mô hình bên ngoài. Chế độ 2D vẫn là mặc định.

## Ngôn ngữ

Chọn Tiếng Việt / English trong nhóm nút header. Lựa chọn lưu ở `localStorage` (`sol-language`). Bản dịch bao gồm nhãn giao diện, thông báo cập nhật, trợ năng và chữ trong cảnh 3D; dữ liệu và cấu hình hệ thống được giữ khi đổi ngôn ngữ. Bảng dịch ở `dist/i18n.js`; thêm bản dịch tương ứng khi thay đổi nội dung tiếng Việt.

## GPS và menu mobile

Trên màn hình rộng tối đa 800px, nút Menu mở danh sách dự đoán điện, sáng/tối và ngôn ngữ; đóng bằng chạm ngoài hoặc Escape. Khi mở app, GPS tự yêu cầu quyền qua HTTPS. Không dùng vị trí mẫu hay tọa độ cookie thay cho vị trí hiện tại. Quyền bị từ chối hoặc GPS lỗi sẽ có hướng dẫn và nút thử lại; người dùng vẫn phải tự cho phép quyền trình duyệt. Thông số pin đã lưu được dùng để tự dự đoán sau khi lấy GPS thành công. Các ô tọa độ và nút lấy vị trí thủ công không còn hiển thị.

## Dự phòng thời tiết

Sau GPS, app tự dự đoán hôm nay bằng cấu hình đã lưu hoặc 11 kWp mẫu có nhãn rõ, cập nhật lại sau 30 phút khi trang hiển thị. Dự báo bức xạ đã xét mây. Tùy chọn dự phòng mặc định bật là quy tắc thận trọng bổ sung, không phải cải thiện độ chính xác đã được kiểm chứng: từng giờ giảm 0–15% khi mây tăng từ 50–100%, cộng 0–10% khi mưa + mưa rào tăng từ 0–2 mm/giờ. Gia quyền theo điện năng; giờ không tạo điện không đóng góp. Thiếu mây/mưa giữ dự báo gốc và báo rõ. Giao diện hiển thị phần trăm dự phòng và cho tắt. Thông số dự phòng chưa hiệu chuẩn với dữ liệu inverter thực tế.

## Redis và cache API dùng chung

Cần Bun và **Redis standalone 7.2+**. Dùng Docker Compose để chạy Redis cục bộ:

```sh
cd sun-compass
docker compose -f deployments/compose.yaml run -d --publish 127.0.0.1:6379:6379 redis
bun run dev
```

Mặc định kết nối `redis://127.0.0.1:6379`. Khi có Redis riêng, tạo `.env` theo `.env.example` và đặt `REDIS_URL`; tất cả replica Bun phải trỏ tới **cùng một Redis primary**. Không đưa URL chứa mật khẩu vào frontend hoặc Git. Dùng `rediss://` và tài khoản ACL khi Redis ở máy khác. Bun Redis client hiện không hỗ trợ Redis Cluster/Sentinel.

Luồng: trình duyệt → `/api/forecast` cùng origin → Redis → Open-Meteo. Không fallback gọi thẳng nhà cung cấp khi Redis/backend lỗi.

- Ô gom thời tiết khoảng **2 × 2 km**: bước vĩ độ `2 / 111,32`, bước kinh độ điều chỉnh theo cos(vĩ độ hàng). Đây là lưới gần đúng, không phải gom mọi điểm cách nhau dưới 2 km; hai điểm gần biên có thể ở hai ô. Hướng mặt trời vẫn dùng GPS đầy đủ.
- Cache Redis: thời tiết tươi 10 phút, dự báo bức xạ tươi 30 phút; giữ tối đa 30 phút/2 giờ để phục vụ khi nhà cung cấp lỗi. Có nhãn dữ liệu cũ. Redis TTL tự dọn dữ liệu.
- Khóa gồm loại dữ liệu, ô tọa độ, khoảng ngày, hướng/nghiêng; không gồm kWp/hao hụt. Key được băm SHA-256.
- Lua claim nguyên tử cấp lease 30 giây cho một bên tải dữ liệu. Replica còn lại đợi có giới hạn 10 giây, đọc lại cache thay vì gọi API. Lượt cùng key trong một tiến trình dùng chung promise. Chủ lease được kiểm tra trước khi ghi/xóa khóa để không ghi đè kết quả của chủ mới.
- Quota **dùng chung mọi replica**: tối đa 8 lượt đồng thời, 50 lượt/phút, 5.000 lượt/ngày. Redis TIME được dùng cho bộ đếm. Cấu hình qua tham số `createRedisForecastProxy` khi cần thay đổi hạn mức.
- HTTP 429 kích hoạt cooldown Redis chung theo `Retry-After` (tối thiểu 60 giây, mặc định 300). Lỗi theo key lưu 60 giây. Không retry upstream vòng lặp.
- Redis lỗi: trả 503, không gọi upstream ngoài quota. Cache còn tươi trong sessionStorage của trình duyệt vẫn dùng được. Request mới cần Redis hoạt động.
- Trình duyệt giữ tối đa 16 kết quả theo TTL server; hủy một người dùng không hủy request chia sẻ. Endpoint chỉ nhận trường và khoảng ngày đã cho phép, cố định host nhà cung cấp.

Compose bật AOF và volume để giữ cache/quota qua restart; `maxmemory-policy noeviction` tránh đẩy mất khóa/quota khi đầy bộ nhớ. Khi Redis đầy, hệ thống trả lỗi thay vì bỏ qua bảo vệ; cần theo dõi và tăng dung lượng. Snapshot/AOF không đảm bảo không mất dữ liệu khi hỏng máy; đặt quota thấp hơn hạn mức nhà cung cấp để có dư địa. Không mở cổng Redis ra Internet; Khi chạy riêng Redis cho môi trường dev, lệnh trên chỉ chuyển tiếp cổng tới loopback.

API miễn phí Open-Meteo dành cho phi thương mại, có quota riêng và có thể tính một request nhiều đơn vị. Đặt `OPEN_METEO_API_KEY` trong backend để dùng customer endpoint nếu cần. Xem [pricing](https://open-meteo.com/en/pricing) và [terms](https://open-meteo.com/en/terms). Redis không loại bỏ chi phí cho các ô vị trí hoàn toàn khác nhau.

### Trang tính toán riêng

- `/`: trang giới thiệu và liên kết đến bốn công cụ.
- `/sun-compass`: la bàn và quỹ đạo mặt trời; không tải dự báo thời tiết/sản lượng.
- `/sol-calculator` (hỗ trợ cả dấu `/` cuối): dự báo điện và bố trí pin 3D (ẩn ngày khám phá và thời tiết hiện tại). Bấm **Mô phỏng hướng nắng** từ menu để chuyển trang.
- Mô hình mái phẳng 8 × 10 m, tầng trệt + 0–3 lầu, mỗi tầng 3,2 m. Thêm từng lầu, xoay góc nhìn bằng kéo/phím mũi tên, chỉnh hướng mặt pin 0–360°, nghiêng 0–90° và dịch cụm pin trên mái.
- Hướng/góc nghiêng được đồng bộ với biểu mẫu dự báo. Khi chỉnh thông số, kết quả cũ bị ẩn và yêu cầu đang chờ bị hủy; bấm tính để lấy dự báo mới.
- Chọn ngày/tháng và vị trí, kéo thanh thời gian hoặc phát từ bình minh tới hoàng hôn. Có thể nhập tọa độ thủ công nếu GPS bị từ chối. Các phép tính hình học vẫn chạy khi API thời tiết không khả dụng.
- Gợi ý góc lắp tìm trên lưới 5° theo quỹ đạo ngày đã chọn, lấy mẫu 10 phút, gia quyền góc tới theo sin độ cao mặt trời. Đây là gợi ý hình học trong ngày, chưa tối ưu sản lượng cả năm.
- 6 tấm là minh họa, không suy ra công suất kWp; công suất vẫn nhập riêng. Bóng đổ trên nền và tỷ lệ cos góc tới chỉ minh họa ánh sáng trực tiếp. Chỉ mô phỏng bóng che từ hai nhà bên; chưa mô hình hóa vật cản khác/dãy pin, kết cấu hay mái nghiêng. Độ cao nhà và dịch chuyển trên mái không thay đổi dự báo kWh.
- Dự báo điện/thời tiết vẫn áp dụng cho hôm nay, độc lập với ngày mô phỏng 3D. Không thêm thư viện hoặc dịch vụ 3D bên ngoài.

## Kiểm tra

```sh
bun run test
# Cần Redis đang chạy; dùng prefix ngẫu nhiên và chỉ dọn key của bài test.
REDIS_TEST_URL=redis://127.0.0.1:6379 bun run test:redis
```

`test:redis` kiểm tra 100 request qua hai proxy độc lập, cache sau khởi tạo lại proxy, quota và cooldown chung. Không gọi Open-Meteo thật. Trong môi trường sandbox hiện tại, test thông thường đã đạt; integration Redis chưa xác minh vì bị chặn socket.

## Log trình duyệt/thiết bị mới

Mỗi GET `/` hoặc `/index.html` được kiểm tra cookie `sol_device_id` (UUID ngẫu nhiên, HttpOnly, SameSite=Lax, hạn 1 năm). Asset, API và HEAD không tạo log truy cập. Redis đánh dấu ID đã gặp và thêm sự kiện `new_device` vào stream `sol:{visitors}:events` bằng một Lua script; các replica dùng chung nên cùng ID không bị ghi lặp. Console Bun cũng xuất một dòng JSON với thời điểm UTC, ID, nhóm thiết bị, OS, trình duyệt và đường dẫn. Không ghi IP, tọa độ, chuỗi User-Agent đầy đủ hoặc query string.

Xem khoảng 20 sự kiện mới nhất:

```sh
docker compose -f deployments/compose.yaml exec redis redis-cli XREVRANGE 'sol:{visitors}:events' + - COUNT 20
```

Stream giữ khoảng 10.000 sự kiện gần nhất; dấu đã thấy tự hết hạn sau 1 năm. Đặt `COOKIE_SECURE=true` khi phục vụ HTTPS qua reverse proxy. Khi URL request trực tiếp là HTTPS, Secure được bật tự động. Trang HTML dùng `private, no-store` để CDN không chia sẻ cookie giữa người dùng.

Đây là nhận diện **trình duyệt bằng cookie**, không khẳng định thiết bị vật lý: xóa cookie, đổi trình duyệt hoặc ẩn danh có thể tạo thiết bị mới; User-Agent chỉ dùng phân loại gần đúng. Khi cookie bị chặn, mỗi lần vào có thể được tính mới. Redis lỗi không chặn trang: chờ tối đa 1 giây, ghi console cho ID mới với `storage: console_only`; có cảnh báo đã giới hạn tần suất. Log trùng/thiếu khi Redis lỗi hoặc request đồng thời trước khi cookie được thiết lập vẫn có thể xảy ra.


## Log console JSON

Tất cả log do ứng dụng server phát ra dùng JSON Lines: mỗi dòng một object, không pretty-print nhiều dòng. Chạy trực tiếp để tránh dòng thông báo thêm của `bun run`:

```sh
bun server.js
# Chỉ giữ cảnh báo và lỗi:
LOG_LEVEL=warn bun server.js
```

Schema chung: `timestamp` (UTC ISO), `level`, `service`, `event`. HTTP thêm `request_id`, `method`, `route`, `status`, `duration_ms`, `cache_status` khi có. Response có `X-Request-ID`; cùng ID được chuyển vào log thiết bị mới và lượt gọi upstream khởi tạo bởi request đó. Với request gộp, log upstream mang ID của người khởi tạo; mỗi người chờ vẫn có HTTP log riêng.

```json
{"timestamp":"2026-11-14T03:00:00.000Z","level":"info","service":"sol-sun-compass","event":"http_request","request_id":"example-request-id","method":"GET","route":"/api/forecast","status":200,"duration_ms":12.4,"cache_status":"hit"}
```

Sự kiện: `server_started`, `server_start_failed`, `server_stopping`, `redis_connected`, `redis_disconnected`, `redis_connect_failed`, `http_request`, `request_failed`, `weather_upstream_response`, `forecast_refresh_failed`, `new_device`, `visitor_log_unavailable`. Dùng `LOG_LEVEL=debug|info|warn|error` (mặc định info). Đầu ra stdout dùng được với Docker logs hoặc hệ thống thu thập log. Log không chứa URL/query đầy đủ, cookie, khóa API, mật khẩu Redis, GPS hoặc error stack. Đường dẫn không thuộc route đã biết ghi `unmatched`.

### Kết quả rà soát 2026-11-14

- `bun run test`: tất cả kiểm tra đạt, gồm phép tính, cache, profile, cảm biến giả lập, log JSON, route và tham chiếu DOM.
- 17 file nguồn qua kiểm tra cú pháp.
- Sửa tự động refresh lưu đè profile đang nhập dở; chặn tính với form chưa hợp lệ.
- Chặn dữ liệu bức xạ có khoảng giờ sai hoặc khoảng tính không hợp lệ.
- HTML HEAD cũng dùng private/no-store; lỗi xử lý request trả JSON 500 có mã đối chiếu.
- Redis visitor log xóa dấu seen nếu thêm stream thất bại, để lần sau có thể thử ghi lại.
- Chưa xác minh Redis integration, browser/mobile và cảm biến thật: sandbox không mở được socket. Không coi các test giả lập là xác minh production.


## Build và chạy bằng Docker

Từ thư mục `sun-compass/`:

```sh
bun run build
bun run start:prod
```

Build tạo `build/server.js` (bundle backend cho Bun) và đóng gói giao diện đã minify vào `build/dist/`. Không ghi đè mã nguồn trong `dist/`. Chạy local production cần Redis như cấu hình trước đó.

Chạy cả app và Redis bằng Compose:

```sh
docker compose -f deployments/compose.yaml up -d --build
docker compose -f deployments/compose.yaml logs -f app
docker compose -f deployments/compose.yaml ps
```

Mở `http://localhost:5173`. App chờ Redis healthy, dùng `redis://redis:6379`, chạy non-root và xuất log JSON. Docker healthcheck gọi HEAD `/app.js`, không tạo log thiết bị mới. Redis vẫn giữ image `redis:8-alpine` và volume hiện có. Build dùng multi-stage với Bun 1.3.14, không đưa `.env`, Git hoặc credentials vào image.

Biến Compose: `APP_PORT` (mặc định 5173), `LOG_LEVEL`, `COOKIE_SECURE`, `OPEN_METEO_API_KEY`. Có thể truyền file cấu hình từ thư mục dự án:

```sh
docker compose --env-file .env -f deployments/compose.yaml up -d --build
```

`REDIS_URL` bên trong container được Compose đặt theo tên service; không dùng localhost. Đặt `COOKIE_SECURE=true` khi phục vụ HTTPS qua reverse proxy. Compose không tự cấp TLS; GPS/cảm biến trên điện thoại vẫn cần URL HTTPS.

Dừng dịch vụ mà giữ dữ liệu Redis:

```sh
docker compose -f deployments/compose.yaml down
```

Xác minh hiện tại: Bun build, toàn bộ test, sao chép asset và `docker compose config --quiet` đã đạt. Chưa build/chạy container được trong sandbox vì Docker bị chặn ghi build-state ở `~/.docker/buildx/`.


### Ổn định cảm biến và 3D theo la bàn

Khi đã nhận hướng Bắc hợp lệ, sự kiện chuyển động tương đối không ghi đè trạng thái hoạt động. Nguồn cảm biến đang dùng được giữ ổn định; chỉ chuyển nguồn khi nguồn hiện tại im lặng hơn 3 giây. Cảnh báo nghiêng dùng ngưỡng vào 40°/ra 30° để tránh nhấp nháy quanh một ngưỡng. Trạng thái chỉ cập nhật khi nội dung thay đổi.

3D mặc định theo heading khi cảm biến sẵn sàng, dùng cùng quy ước hướng với 2D. Kéo tay ngắt theo dõi trong 3D nhưng không tắt cảm biến của 2D. Nút theo la bàn bật lại theo dõi và yêu cầu quyền cảm biến nếu chưa bật. Đây là xoay theo phương vị; giữ điện thoại nằm phẳng, không phải chế độ AR theo toàn bộ góc nghiêng của điện thoại. Kiểm tra giả lập và build đã đạt; cần xác nhận cảm biến trên điện thoại thật.


### Mobile và giữ hướng la bàn

Tắt hoặc mất cảm biến giữ heading cuối của la bàn 2D và góc nhìn 3D đã xem, không quay về Bắc mặc định. Nhãn hiển thị “Giữ hướng”; bật lại sẽ tiếp tục cập nhật theo điện thoại. Trên màn hình tối đa 800px, thứ tự DOM là dự đoán điện → mô phỏng trong ngày → nội dung còn lại; quay về desktop sẽ khôi phục bố cục thường. GPS thành công chỉ hiện trạng thái đã lấy vị trí, không hiện sai số mét. Giải thích chấm vàng nằm trong mục mở rộng dưới Mặt trời mọc. Icon nút dùng SVG mask và favicon dùng `dist/favicon.svg`.


## Đóng gói mã production

`bun run build` gộp các script giao diện theo đúng thứ tự thành `build/dist/app.js`, minify tên biến/cú pháp/khoảng trắng, nén CSS và giữ script theme riêng để tránh nháy sáng lúc tải trang. Không xuất source map. Server production chỉ phục vụ HTML, bundle app, theme, CSS và favicon; không mở các đường dẫn script nguồn riêng. Docker chỉ chép output đã build vào image runtime.

```sh
bun run test:build
bun run start:prod
# Hoặc build lại Docker:
docker compose -f deployments/compose.yaml up -d --build
```

`bun run dev` và `bun run start` vẫn chạy nguồn dễ đọc để phát triển. Minify không mã hóa JavaScript: trình duyệt phải tải và chạy mã, nên DevTools vẫn có thể xem/pretty-print. API key, credentials Redis, quota và cache phía server không được đưa vào frontend. Không nhúng bí mật vào JavaScript, dù mã đã nén.


## Tối ưu tải trang mobile

Bản build production dùng tên asset có hash nội dung và `Cache-Control: public, max-age=31536000, immutable`. HTML vẫn `private, no-store` vì cookie thiết bị; `/app.js` là alias healthcheck với `no-cache`. Khi build mới thay đổi nội dung, HTML trỏ sang hash mới. Chỉ các route trong manifest mới được phục vụ.

Build tạo sẵn Brotli (`.br`) và Gzip (`.gz`); server chọn theo `Accept-Encoding`, giữ Content-Type gốc, gửi `Vary: Accept-Encoding` và xử lý HEAD. Reverse proxy cần giữ các header này và không nén lại body đã có Content-Encoding. Không cần nén runtime cho từng request.

Font hệ thống thay Google Fonts `@import`, bỏ request DNS/font/CSS bên ngoài. Preload bundle app từ head. Log visitor được chuẩn bị cookie đồng bộ nhưng ghi Redis ở nền, không làm chậm HTML; trong trường hợp process bị dừng ngay sau response, log nền có thể chưa hoàn tất. Quỹ đạo 2D cache theo ngày/vị trí/múi giờ; chỉ chiếu lại khi đổi hướng. Chế độ tiếng Việt không chạy MutationObserver dịch trên mọi lần cập nhật SVG.

Kiểm tra bằng `bun run test:build`: startup bundle/GPS/thanh giờ, giải nén Brotli/Gzip, đàm phán q=0, cache hash và HTML không chờ Redis. Chưa xác minh điểm Lighthouse/PageSpeed hay Core Web Vitals trên website đã deploy. Liên kết báo cáo người dùng gửi chưa truy cập được từ môi trường thực thi; cần chạy lại PageSpeed sau khi deploy để so sánh.

### Cài đặt mô phỏng 3D

Menu **Cài đặt mô phỏng** nằm ở góc trên bên phải canvas, mặc định đóng. Mở menu và chọn nhóm trong dropdown để điều chỉnh nhà/mái, nhà bên, pin, la bàn hoặc vị trí; nhấn Escape để đóng. Kéo chuột trái/phải hoặc một ngón để xoay góc nhìn; cuộn chuột, chụm hai ngón hoặc dùng nút/phím + và − để zoom 50–400%. Phím F hoặc Đặt lại góc nhìn khôi phục góc nhìn và zoom. Có góc nhìn Mặt trước / Từ trên. Xoay góc nhìn không đổi hướng địa lý; thanh Hướng cửa chính (hướng nhà) xoay cả nhà và pin.

Chọn mái bằng hoặc mái Thái hai dốc (đỉnh cao 3 m). Mái Thái dùng giàn pin vượt đỉnh mái, chân đỡ chạm mặt mái dốc và được vẽ theo chiều sâu, chưa hỗ trợ pin áp theo mặt mái. Gợi ý cả năm lấy mẫu 12 ngày giữa tháng, mỗi 30 phút và gia quyền theo số ngày từng tháng. Tìm thô hướng mỗi 15° và độ nghiêng mỗi 10°, tinh chỉnh vùng tốt theo bước 5°, kiểm tra các ứng viên cuối với 36 ô/tấm. Điểm là tổng cos góc tới dương × sin độ cao mặt trời × tỷ lệ pin không bị nhà bên che. Giữ nguyên tâm từng tấm, loại hướng gây chồng lấn/vượt mái. Đây là gợi ý gần đúng, đã xét bóng che nhà bên và mái Thái, chưa xét thời tiết hoặc bóng che giữa các tấm, không dự báo điện năm. Nút gợi ý áp dụng trực tiếp hướng/góc vào cấu hình điện, cần tính lại sản lượng.

Trong dropdown, **Nhà chính & mái** cho phép đổi chiều dài 8–30 m (ngang 8 m); thân nhà, mái và chiều dài nhà bên cập nhật cùng nhau. **Nhà bên trái / phải** chỉnh độc lập 0–5 tầng mỗi bên. **Tấm pin & hướng tối ưu** có nút thêm/bớt 1–30 tấm, xếp thành cụm các tấm khoảng 1,2 × 2 m; vị trí tự giới hạn trong mái khi thay đổi hướng, kích thước hoặc số lượng. Bóng che được tính trên các tấm đang hiển thị. Số tấm minh họa không tự đổi tổng công suất kWp của dự báo.


### Bố trí pin trên mặt phẳng và che nắng mái Thái

- Bấm **Đặt tấm pin** dưới mô hình để mở popup. Kéo từng tấm hoặc chọn tấm rồi dùng phím mũi tên (10 cm), thêm/xóa hoặc xếp tự động. **Áp dụng lên 3D** xác nhận bố trí; **Hủy** và Escape giữ bố trí cũ. Không cho chồng pin hoặc vượt biên mái. Bố trí đã áp dụng được tự động lưu riêng trên trình duyệt bằng localStorage; bản nháp bị hủy không được lưu.
- Mặt phẳng bố trí biểu diễn vị trí tâm và kích thước tấm khi nằm ngang; mô hình 3D giữ nguyên tâm và áp dụng hướng/góc nghiêng đang chọn. Pin nằm trên giàn cao hơn đỉnh mái 35 cm ở cạnh thấp nhất, không áp mái. Đổi hướng/kích thước làm bố trí không còn vừa mái sẽ dùng bố trí tự động.
- Cửa hai cánh đánh dấu hướng nhà. Nhà bên trái/phải có lựa chọn mái bằng hoặc mái Thái độc lập, đỉnh mái Thái cao thêm 3 m; chọn 0 tầng sẽ bỏ cả thân và mái nhà bên đó.
- Đón nắng trực tiếp = cos góc tới dương × tỷ lệ diện tích pin không bị nhà bên che, lấy mẫu 36 ô mỗi tấm, gồm bóng che mái Thái. Chỉ số này cập nhật theo thời gian/hướng nhà/hướng pin/vị trí pin. Gợi ý hướng/góc nghiêng đã xét bóng che cục bộ; dự báo kWh vẫn chưa trừ phần bóng che này.
- Mô hình dùng bộ đệm độ sâu từng điểm ảnh để mái không vẽ đè pin sai thứ tự. Nhà thực sự nằm trước pin vẫn che pin đúng theo góc nhìn.
- Kiểm tra bổ sung: `node tests/depth-renderer.test.cjs` (120 góc nhìn và thứ tự mặt), `node tests/panel-geometry.test.cjs` (giàn, vị trí và bóng che mái Thái), `bun run test:build` (popup áp dụng/hủy và bản build).


### Tự lưu mô phỏng trên từng trình duyệt

`sol-planner-v1` trong localStorage lưu nhà/mái, chiều dài, số tầng nhà bên và kiểu mái, hướng nhà, hướng/độ nghiêng pin, tọa độ từng tấm đã áp dụng, góc nhìn/zoom, tọa độ mô phỏng/múi giờ và cấu hình công suất/hao hụt/dự phòng. Khi mở lại, cấu hình mô phỏng ưu tiên hơn hướng/góc pin trong cookie dự báo điện cũ. Vị trí mô phỏng đã lưu không bị GPS tự động ghi đè; nút **Dùng vị trí hiện tại** cho phép cập nhật chủ động. Ngày/giờ bắt đầu theo hôm nay để tránh dùng ngày mô phỏng cũ.

Dữ liệu gắn với trình duyệt và địa chỉ website, chưa đồng bộ tài khoản/thiết bị; xóa dữ liệu website sẽ xóa mô phỏng. Trình duyệt không cho lưu sẽ có thông báo ngay dưới mô hình. Dữ liệu sai định dạng/phiên bản hoặc ngoài giới hạn không được khôi phục. Khi tính toán, trình duyệt gửi hình học mái và vật cản, cấu hình điện và tọa độ cần thiết tới gateway cùng origin. Redis lưu tạm kết quả theo hàm băm của đầu vào.

Trang `/sol-calculator` ẩn cả mục **Thời gian có ánh sáng**, vẫn giữ thời gian mọc/lặn ở phần điều khiển. Kiểm thử lưu/khôi phục: `node tests/planner-state.test.cjs`; kiểm thử tải lại bản build, hủy bản nháp và kết quả gợi ý hết hạn: `bun run test:build`.


### Sao lưu và khôi phục profile mô phỏng

Cạnh nhãn **Bắc = 0°** ở tiêu đề mô hình, icon tải xuống **Sao lưu profile** tải file `sol-profile-<thời gian>.json` chứa cấu hình hiện tại, các vị trí pin đã áp dụng, góc nhìn, tọa độ/múi giờ (nếu đã có) và cấu hình điện. File được tạo ngay trên trình duyệt, không tải lên máy chủ. Có thể giữ nhiều file để lưu các phương án hoặc chuyển sang trình duyệt/thiết bị khác.

Icon tải lên **Khôi phục profile từ file** đọc file JSON, kiểm tra định dạng/phiên bản và thông số trước khi thay mô phỏng hiện tại, rồi tự lưu trên trình duyệt. File sai định dạng, vượt 64 KB, vị trí pin chồng lấn/vượt mái hoặc thông số không hợp lệ bị từ chối; cấu hình hiện có được giữ nguyên. Khôi phục thay cấu hình hiện tại, nên xuất bản sao trước nếu cần giữ phương án cũ. File không có tọa độ sẽ giữ vị trí đang dùng. Tọa độ trong file là vị trí mô phỏng, nên chỉ chia sẻ file khi muốn chia sẻ cả vị trí đó.

Nút cài đặt mô phỏng dùng icon bánh răng ở góc canvas. Các icon cài đặt/sao lưu/khôi phục giữ nhãn trợ năng và chú thích khi rê chuột, vùng bấm 44 px.

### Compass, cache và kiểm chứng mặt trời

- Compass chỉ cập nhật góc/nhãn trong `requestAnimationFrame`, gộp các sự kiện trong cùng khung hình. Bộ lọc vòng tròn có hằng số thời gian 100 ms và vùng chết 0,4°, tránh nhảy khi qua hướng Bắc. Đổi nguồn cảm biến hoặc xoay màn hình sẽ đặt lại bộ lọc.
- Thiết bị báo RAM ≤ 4 GB hoặc ≤ 4 luồng CPU dùng canvas DPR tối đa 1, ít điểm quỹ đạo và ít hiệu ứng mây/mưa hơn. Nếu trình duyệt không cung cấp thông tin, dùng chất lượng mặc định. Chưa đo FPS trên thiết bị vật lý.
- Cache forecast giới hạn 16 mục, tối đa 30 phút: tọa độ làm tròn 4 chữ số, ngày UTC và toàn bộ tham số (loại dữ liệu, khoảng ngày, múi giờ, góc pin). Request cùng khóa dùng chung promise; hủy một consumer không hủy request chung. Lỗi mạng/408/429/5xx tạm thời thử tối đa 3 lần, timeout 3 giây/lần, backoff tăng dần kèm jitter. `Retry-After` dài được chuyển thành cooldown theo khóa để không giữ giao diện chờ. Thời điểm cập nhật thành công gần nhất vẫn hiện khi lần tải sau lỗi.
- Solar dùng NOAA/Meeus tại thời điểm UTC thực, kể cả chuyển ngày. Độ cao là góc hình học chưa hiệu chỉnh khúc xạ; mọc/lặn dùng ngưỡng −0,833°. Giờ là phút trong ngày địa phương theo UTC offset người dùng chọn (cần chọn offset DST đúng ngày). Sự kiện không xảy ra trả về `null`; ngày/đêm vùng cực có thời lượng 1440/0 phút.
- `tests/fixtures/noaa.json` chứa dữ liệu sinh độc lập từ [mã NOAA](https://gml.noaa.gov/grad/solcalc/main.js), kèm SHA-256 nguồn. Tái tạo: tải nguồn rồi chạy `bun scripts/generate-noaa-fixtures.cjs /path/to/noaa-main.js`. Generator tắt khúc xạ để so cùng quy ước và chuẩn hóa phút UTC trước khi gọi hàm NOAA cho múi giờ sát đường đổi ngày. Test không cần mạng: 9 địa điểm × 5 ngày (hai phân, hai chí, ngày nhuận), 225 vị trí, múi giờ lẻ +5:45 và +14, hai bán cầu và vùng cực. Ngưỡng đối chiếu 0,01° / 2 phút là sai lệch với thuật toán tham chiếu, không phải cam kết độ chính xác quan sát thực tế.

Mô phỏng trong năm: kéo thanh ngày hoặc bấm **Chạy cả năm** (3 ngày mỗi bước), giữ nguyên giờ địa phương để so sánh các mùa. Có hỗ trợ năm nhuận, dừng ở cuối năm và khi chuyển sang mô phỏng trong ngày. Hai nút icon đặt pin/theo la bàn nằm trên canvas; khung cài đặt có vùng cuộn cao hơn.

Chiều rộng nhà chính chỉnh từ 3–30 m, bước 0,2 m; chiều dài 8–30 m, bước 0,5 m; nhà mới mặc định 3 × 8 m; mái, giàn đỡ, mặt phẳng bố trí và vị trí nhà bên cập nhật theo chiều rộng. Profile cũ thiếu chiều rộng mặc định 8 m. Gợi ý bố trí cả năm bổ sung tìm vị trí riêng cho từng tấm trên lưới 0,5 m, thử nhiều điểm khởi đầu, cho phép thành cụm hoặc rời rạc; giữ số tấm, không chồng nhau/vượt mái, chỉ thay bố trí khi chỉ số đón nắng tăng. Đây là tìm kiếm gần đúng có xét bóng nhà bên; chưa mô phỏng bóng che lẫn nhau giữa các tấm, khoảng lối đi hay yêu cầu kết cấu thi công.

Trong **Sắp xếp tấm pin**, chọn tấm và bấm **Xoay tấm 90°** hoặc phím **R** để đổi ngang/dọc. Góc này xoay kích thước tấm trên mặt phẳng lắp, giữ hướng đón nắng/độ nghiêng chung. Kéo thả giữ góc xoay; chỉ lưu khi áp dụng, Hủy bỏ thay đổi. Kiểm tra va chạm, 3D, bóng che và file backup đều dùng cùng góc xoay. Sau khi gợi ý, mục **Vì sao bố trí tấm pin như vậy?** trình bày hướng/nghiêng được chọn, số tấm di chuyển và chỉ số che nắng trước/sau theo mẫu mô phỏng; giải thích ẩn khi cấu hình thay đổi.

### Công suất và kích thước thực của module

Nhập **số tấm × W/tấm**, tổng kWp = số tấm đã bố trí × W / 1000 (chỉ đọc). Hỗ trợ 550–700 W theo bước 5 W, tối đa 30 tấm và giới hạn hình học của mái. Bảng tham chiếu theo **model hãng**, không phải trung bình thị trường hoặc một quy luật suy kích thước từ W; được kiểm tra ngày 22/11/2026:

| W được chọn | Dài × rộng (mm) | Nguồn/model |
|---|---|---|
| 550–565 | 2278 × 1134 | [Jinko 72HL4 550–570 W](https://jinkosolarcdn.shwebspace.com/uploads/JKM550-570M-72HL4-(V)-F5-EN.pdf) |
| 570–605 | 2384 × 1134 | [Trina NEG19RC.20 2023](https://static.trinasolar.com/sites/default/files/Datasheet_Vertex_NEG19RC.20.pdf) |
| 610–630 | 2382 × 1134 | [Jinko 66HL4M-BDV](https://jinkosolarcdn.shwebspace.com/uploads/JKM605-630N-66HL4M-BDV-F5-EN.pdf) |
| 635–650 | 2382 × 1134 | [Trina NEG19RC.20 2025](https://pages.trinasolar.com/rs/567-KJK-096/images/Datasheet_Vertex_NEG19RC.20_2025_PD1M.pdf) |
| 655–670 | 2382 × 1134 | [Jinko 66QL6-BDV](https://www.jinkosolar.com/uploads/JKM650-670N-66QL6-BDV-F3-EN.pdf) |
| 675–700 | 2384 × 1303 | [Trina NEG21C.20](https://pages.trinasolar.com/rs/567-KJK-096/images/NEG21C.20_EN_2023_POWER_700W.pdf) |

Ví dụ: 6 tấm 600 W = 3,6 kWp; mỗi tấm dài 2,384 m, rộng 1,134 m. Mô hình, kéo thả, xoay, kiểm tra mép mái/va chạm và tìm bố trí đều dùng cùng kích thước. Xếp tự động chừa khe 20 mm, thử cả ngang/dọc; giới hạn hình học kiểm tra theo kích thước chưa nghiêng (bảo thủ), chưa trừ khoảng bảo trì. Sức chứa tự động là phương án tìm được, không khẳng định cực đại của mọi cách xếp rời rạc. Khi mái/kích thước đổi, xếp lại và giảm số tấm nếu cần, rồi tính lại kWp; kết quả dự báo cũ bị ẩn.

Profile mới lưu W/tấm và số tấm; kWp được suy ra, không dùng số nhập tay cũ. Profile cũ chưa có W/tấm dùng tham chiếu 600 W khi mở, kiểm tra/xếp lại vị trí theo kích thước thật. Bảng nguồn được lưu trong `PanelGeometry.moduleCatalog`, không tải dữ liệu web mỗi lần mô phỏng.

### Audit P0 dự báo điện — 22/11/2026

Trước sửa: dự báo lấy GTI × kWp × hao hụt gộp; giảm dự phòng mây/mưa bật mặc định; bóng nhà bên chỉ dùng khi vẽ; chưa có giới hạn AC hoặc MPPT. Bộ acceptance `tests/energy-system.test.cjs` được viết và chạy trước triển khai: 10 ca thất bại vì thiếu API mới và mặc định giảm dự phòng; bộ regression cũ vẫn qua. Fixture bóng che sau đó được chỉnh về nhà bên 2 tầng để có khác biệt giữa hai tấm, thay vì cả hai cùng bị che hoàn toàn.

Hiện render và dự báo cùng dùng `PanelGeometry.scene/exposure`: mái, nhà bên, hướng nhà, vị trí và góc xoay mỗi tấm. Lấy 36 điểm trên mỗi tấm, tích phân bước tối đa 15 phút trong từng giờ; diện tích nhận nắng là xấp xỉ lấy mẫu. Bóng che chỉ giảm thành phần trực tiếp `min(GTI, DNI × cos(góc tới))`; phần còn lại giữ nguyên. GTI và DNI là trung bình giờ trước timestamp theo [Open-Meteo](https://open-meteo.com/en/docs). Thiếu DNI thì báo lỗi, không âm thầm bỏ bóng che.

Chuỗi tính: DC từ bức xạ → bóng che → nhiệt độ → dây dẫn → bụi → hao hụt khác → giới hạn MPPT → hiệu suất inverter → clipping AC. Mỗi hao hụt chỉ trừ một lần. Dự phòng thời tiết mặc định tắt, có thể bật riêng thành kịch bản thận trọng. Giao diện hiển thị tổng DC/AC, ngân sách hao hụt và bảng từng giờ/từng tấm. Chỉnh hình học làm ẩn dự báo cũ và hủy hiệu lực phản hồi đang chờ.

Hybrid cho nhập AC định mức, PV DC tối đa, hiệu suất, số MPPT, cửa sổ điện áp, dòng tối đa mỗi MPPT và điện áp vận hành giả định. Công suất DC lắp vượt mức PV thì từ chối tính. Panel được chia luân phiên vào MPPT; giới hạn dòng áp dụng riêng từng MPPT theo P/V. Cấu hình mới được lưu và xuất/nhập backup. Profile cũ vẫn đọc được; hao hụt gộp cũ không cộng vào mô hình mới, dùng các mặc định hao hụt riêng và cần kiểm tra lại trong form.

Giới hạn: nhiệt độ là tỷ lệ cố định do người dùng nhập, chưa có mô hình nhiệt tế bào; MPPT chưa mô tả đấu chuỗi, Voc/Isc hay kiểm tra thiết kế điện. AC từng tấm là phân bổ theo DC được nhận, không phải đo độc lập. Chưa mô phỏng bóng giữa các tấm, che khuất bầu trời khuếch tán, diode bypass/mismatch hoặc giới hạn phát lên lưới. Kịch bản lưu trữ mô phỏng sạc/xả theo giờ. ROI giả định 12 ngày đại diện cho 12 tháng, gia quyền theo số ngày từng tháng với giá điện cố định, không tính tiền bán điện dư hoặc suy giảm thiết bị.

Kiểm tra tự động: `bun run test` (bóng che riêng từng tấm, bất biến khi xoay nhà, bảo toàn năng lượng, không giảm thời tiết hai lần, clipping theo giờ, MPPT, thiếu DNI, khoảng giờ lẻ, ban đêm, luồng UI bằng mock, phản hồi cũ, persistence và proxy); `bun run test:build` (bundle sản xuất trong DOM/canvas giả lập và ngân sách hiệu năng). Chưa kiểm tra giao diện bằng trình duyệt thật, API thời tiết trực tiếp hoặc đối chiếu sản lượng đo ngoài thực tế.

### Validation engine và prototype bố trí năm

Báo cáo kiến trúc, lỗi tái hiện, contract geometry, kết quả test trước/sau và giới hạn: [docs/validation/AUDIT.md](docs/validation/AUDIT.md). Chạy regression CI bằng `bun run test:ci`.

Trong Gợi ý có prototype so sánh bố trí theo kWh/năm với bức xạ năm giả định do người dùng nhập. Kết quả có preview và xác nhận trước khi áp dụng; không phải dự báo khí hậu năm từ Open-Meteo. Các gợi ý hiện hữu cũng cần xác nhận ở màn hình so sánh.

ROI sử dụng GTI và DNI lịch sử của Open-Meteo. Gateway lấy năm dương lịch hoàn chỉnh gần nhất có ít nhất bảy ngày để nhà cung cấp cập nhật dữ liệu, rồi cache 12 biểu đồ bức xạ trung bình theo giờ trong Redis 30 ngày. Go mô phỏng mái, inverter và pin lưu trữ cho ngày 15 mỗi tháng và tính tổng theo số ngày trong tháng. Mô hình phản ánh biến động giữa các tháng nhưng làm phẳng các chuỗi ngày mưa liên tiếp trong cùng tháng. Khi thiếu dữ liệu lịch sử, dự báo điện trong ngày vẫn hoạt động và ROI hiển thị trạng thái thiếu dữ liệu.

Đặt `SOL_PPROF=1` trên service calculator để thu CPU, heap hoặc goroutine profile qua Unix socket. Ví dụ, từ container chẩn đoán có quyền truy cập volume socket, chạy `curl --unix-socket /run/huongnang/calc.sock http://localhost/debug/pprof/heap -o heap.pprof`. Gateway công khai chỉ cho phép các phép tính trong danh sách API.
