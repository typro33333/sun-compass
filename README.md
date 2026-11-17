# Sol — La bàn mặt trời

Giao diện HTML, CSS và JavaScript với máy chủ Bun phục vụ file và API proxy có cache dùng chung. Cần cài Bun; không cần dependencies. `bun run start` chạy không theo dõi thay đổi; `PORT=8080 bun run dev` đổi cổng.

## Chạy cục bộ

```sh
cd sun-compass
bun run dev
```

Mở http://localhost:5173. GPS và cảm biến yêu cầu HTTPS hoặc localhost cùng quyền trình duyệt. Để thử trên điện thoại, chạy máy chủ Bun sau reverse proxy hoặc tunnel HTTPS. Chỉ upload `dist/` sẽ không đủ vì thời tiết và dự báo điện cần `/api/forecast`.

## Trang tính toán riêng

- `/`: la bàn và quỹ đạo mặt trời; không tải dự báo thời tiết/sản lượng.
- `/sol-calculartor` (hỗ trợ cả dấu `/` cuối): thời tiết hiện tại, dự báo điện và bố trí pin 3D. Bấm **Tính toán điện mặt trời** từ menu để chuyển trang.
- Mô hình mái phẳng 8 × 10 m, tầng trệt + 0–3 lầu, mỗi tầng 3,2 m. Thêm từng lầu, xoay góc nhìn bằng kéo/phím mũi tên, chỉnh hướng mặt pin 0–360°, nghiêng 0–90° và dịch cụm pin trên mái.
- Hướng/góc nghiêng được đồng bộ với biểu mẫu dự báo. Khi chỉnh thông số, kết quả cũ bị ẩn và yêu cầu đang chờ bị hủy; bấm tính để lấy dự báo mới.
- Chọn ngày/tháng và vị trí, kéo thanh thời gian hoặc phát từ bình minh tới hoàng hôn. Có thể nhập tọa độ thủ công nếu GPS bị từ chối. Các phép tính hình học vẫn chạy khi API thời tiết không khả dụng.
- Gợi ý góc lắp tìm trên lưới 5° theo quỹ đạo ngày đã chọn, lấy mẫu 10 phút, gia quyền góc tới theo sin độ cao mặt trời. Đây là gợi ý hình học trong ngày, chưa tối ưu sản lượng cả năm.
- 6 tấm là minh họa, không suy ra công suất kWp; công suất vẫn nhập riêng. Bóng đổ trên nền và tỷ lệ cos góc tới chỉ minh họa ánh sáng trực tiếp. Chưa mô hình hóa bóng che vật cản/dãy pin, kết cấu hay mái nghiêng. Độ cao nhà và dịch chuyển trên mái không thay đổi dự báo kWh.
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

Tính toán gần đúng theo [NOAA](https://www.gml.noaa.gov/grad/solcalc/solareqns.PDF), ngưỡng mọc/lặn −0.833°. Không tính địa hình hay vật cản; cảm biến có thể bị nhiễu từ. Tọa độ được gửi tới API Open-Meteo để lấy thời tiết; phép tính mặt trời vẫn chạy trong trình duyệt. Giao diện dùng font hệ thống để tránh tải font bên ngoài.

`.openai/hosting.json` hiện vẫn là cấu hình hosting tĩnh cũ và chưa hỗ trợ API proxy mới. Muốn triển khai Sites phải chuyển sang server/Worker hoặc định tuyến `/api/forecast` về backend Bun trước; không xuất bản chỉ thư mục `dist/`.

## Dự đoán điện mặt trời

Nút trên header mở công cụ ước tính **kWh cả ngày hôm nay**, độc lập ngày mô phỏng. Nhập kWp (mặc định 11), độ nghiêng, phương vị tấm pin và phần trăm hao hụt tổng (mặc định 20%). Tọa độ và múi giờ lấy từ màn hình chính.

Dùng `global_tilted_irradiance` theo giờ từ Open-Meteo (W/m², trung bình giờ trước mốc thời gian). Cộng phần giao của mỗi giờ với ngày địa phương, đổi sang kWh/m² rồi tính `kWh = kWp × giờ nắng tương đương × (1 − hao hụt/100)`. Ví dụ minh họa: 11 kWp × 5 giờ × 0,8 = 44 kWh; đây không phải dự báo thực tế khi chưa tải dữ liệu.

Dự báo bức xạ đã phản ánh mây trong mô hình, không nhân thêm hệ số mây. Chưa mô hình hóa riêng bóng che, nhiệt độ tấm pin, clipping inverter, lưu trữ hay cắt giảm phát. Lỗi API hoặc thiếu giờ trả thông báo lỗi, không thay bằng dữ liệu giả. API nhận tọa độ và hướng/nghiêng tấm pin; không gửi công suất hệ thống.

## Cấu hình lưu trên trình duyệt

Khi bấm tính sản lượng, cookie `sol_pv_profile` lưu kWp, hao hụt, độ nghiêng, hướng tấm pin, tọa độ và múi giờ trong 1 năm (`SameSite=Lax`, `Secure` trên HTTPS). Lần mở lại sẽ khôi phục cấu hình và tự tải dự báo cho ngày hiện tại, kể cả khi mở vào tháng khác; không tái sử dụng sản lượng cũ. Kết quả xuất hiện trên trang chính. Đổi tọa độ sẽ cập nhật cấu hình và tính lại. Cookie bị xóa/hết hạn hoặc trình duyệt chặn lưu thì cần nhập lại. Cấu hình thuộc trình duyệt và miền hiện tại, không đồng bộ giữa thiết bị.

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
docker compose -f deployments/compose.yaml up -d redis
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

Compose bật AOF và volume để giữ cache/quota qua restart; `maxmemory-policy noeviction` tránh đẩy mất khóa/quota khi đầy bộ nhớ. Khi Redis đầy, hệ thống trả lỗi thay vì bỏ qua bảo vệ; cần theo dõi và tăng dung lượng. Snapshot/AOF không đảm bảo không mất dữ liệu khi hỏng máy; đặt quota thấp hơn hạn mức nhà cung cấp để có dư địa. Không mở cổng Redis ra Internet; Compose chỉ bind localhost.

API miễn phí Open-Meteo dành cho phi thương mại, có quota riêng và có thể tính một request nhiều đơn vị. Đặt `OPEN_METEO_API_KEY` trong backend để dùng customer endpoint nếu cần. Xem [pricing](https://open-meteo.com/en/pricing) và [terms](https://open-meteo.com/en/terms). Redis không loại bỏ chi phí cho các ô vị trí hoàn toàn khác nhau.

### Trang tính toán riêng

- `/`: la bàn và quỹ đạo mặt trời; không tải dự báo thời tiết/sản lượng.
- `/sol-calculartor` (hỗ trợ cả dấu `/` cuối): thời tiết hiện tại, dự báo điện và bố trí pin 3D. Bấm **Tính toán điện mặt trời** từ menu để chuyển trang.
- Mô hình mái phẳng 8 × 10 m, tầng trệt + 0–3 lầu, mỗi tầng 3,2 m. Thêm từng lầu, xoay góc nhìn bằng kéo/phím mũi tên, chỉnh hướng mặt pin 0–360°, nghiêng 0–90° và dịch cụm pin trên mái.
- Hướng/góc nghiêng được đồng bộ với biểu mẫu dự báo. Khi chỉnh thông số, kết quả cũ bị ẩn và yêu cầu đang chờ bị hủy; bấm tính để lấy dự báo mới.
- Chọn ngày/tháng và vị trí, kéo thanh thời gian hoặc phát từ bình minh tới hoàng hôn. Có thể nhập tọa độ thủ công nếu GPS bị từ chối. Các phép tính hình học vẫn chạy khi API thời tiết không khả dụng.
- Gợi ý góc lắp tìm trên lưới 5° theo quỹ đạo ngày đã chọn, lấy mẫu 10 phút, gia quyền góc tới theo sin độ cao mặt trời. Đây là gợi ý hình học trong ngày, chưa tối ưu sản lượng cả năm.
- 6 tấm là minh họa, không suy ra công suất kWp; công suất vẫn nhập riêng. Bóng đổ trên nền và tỷ lệ cos góc tới chỉ minh họa ánh sáng trực tiếp. Chưa mô hình hóa bóng che vật cản/dãy pin, kết cấu hay mái nghiêng. Độ cao nhà và dịch chuyển trên mái không thay đổi dự báo kWh.
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

Mở `http://localhost:5173`. App chờ Redis healthy, dùng `redis://redis:6379`, chạy non-root và xuất log JSON. Docker healthcheck gọi HEAD `/app.js`, không tạo log thiết bị mới. Redis vẫn giữ image `redis:8-alpine`, cổng và volume hiện có. Build dùng multi-stage với Bun 1.3.14, không đưa `.env`, Git hoặc credentials vào image.

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

Kiểm tra bằng `bun run test:build`: startup bundle/GPS/thanh giờ, giải nén Brotli/Gzip, đàm phán q=0, cache hash và HTML không chờ Redis. Số đo build hiện tại: app khoảng 49,7 KB → 15,4 KB Brotli; CSS 29,7 KB → 5,7 KB. Chưa xác minh điểm Lighthouse/PageSpeed hay Core Web Vitals trên website đã deploy. Liên kết báo cáo người dùng gửi chưa truy cập được từ môi trường thực thi; cần chạy lại PageSpeed sau khi deploy để so sánh.
