# Simulation engine validation & auto placement prototype

Ngày thực hiện: 2026-11-22. Chỉ sửa workspace; không deploy, không chạy compose, không đổi environment/Redis/browser profile đang sử dụng. Workspace đã có thay đổi UI/packing từ các yêu cầu trước; chúng được giữ lại. Đây là audit tính nhất quán mô phỏng, không phải chứng nhận sản lượng thực tế.

## Phạm vi và kiến trúc

Đã rà inventory source trước khi sửa, chạy regression hiện hữu, lần theo đường geometry → render/forecast → persistence và đường request. Phạm vi gồm các module dưới đây; phần trọng tâm được kiểm tra bằng test mới.

| Nhóm source | Vai trò / kết luận audit |
|---|---|
| `dist/panel-geometry.js` | Tọa độ Đông/lên/Nam (m), góc Bắc theo chiều kim đồng hồ; footprint, packing, ray/convex volumes, mái Thái, scorer gợi ý cũ. Renderer và forecast vốn đã gọi `scene/exposure`, nhưng scene thiếu hồ sơ panel và renderer tự chia ô. |
| `dist/panel-planner.js`, `panel-layout-editor.js`, `depth-renderer.js` | State UI, render bằng depth buffer, editor dùng footprint chưa nghiêng. Gợi ý cũ tự áp dụng kết quả; đường forecast invaliation có sự kiện UI và key geometry. |
| `dist/energy.js`, `energy-ui.js`, `profile.js`, `planner-state.js` | Tích phân 15 phút trong GTI/DNI trung bình giờ, mất bóng trực tiếp, hao hụt DC, MPPT, inverter, clipping. Lưu profile/backup; version request chặn kết quả cũ khi có sự kiện. |
| `dist/forecast-client.js`, `lib/forecast-proxy.mjs`, `redis-forecast.mjs` | Cache, request sharing, retry/backoff, hủy riêng consumer, TTL, lease/quota Redis. API chỉ cho ngày gần hiện tại, không có dữ liệu năm. Giữ nguyên. |
| `dist/solar.js`, `app.js`, `scene.js`, `sensor.js` | Vị trí mặt trời theo UTC offset, NOAA regression, ngày/đêm vùng cực, compass smoothing/RAF. Không sửa công thức. |
| `dist/index.html`, `style.css`, `calculator-page.js`, `i18n.js`, `theme.js`, `startup.js` | Layout, di chuyển DOM giữa home/calculator, locale/theme và GPS. Chỉ thêm UI preview/kịch bản; không đưa lại dashboard từng tấm đã bỏ. |
| `server.js`, `lib/http-handler.mjs`, `static-response.mjs`, `visitor-log.mjs`, `logger.mjs` | Routes, compression, logging, visitor state. Chỉ thêm route asset prototype; không đổi API/upstream/cấu hình vận hành. |
| `scripts/*`, `package.json`, `tests/*`, Dockerfile/compose | Build classic scripts theo thứ tự, test offline/mock. Thêm CI regression; giữ Docker/compose nguyên trạng. |

## Các phát hiện và xử lý

| Mức | Phát hiện | Bằng chứng trước sửa | Xử lý |
|---|---|---|---|
| P0 | Geometry bị sửa programmatically không phát `input` vẫn có thể nhận kết quả API dùng snapshot cũ | `before-race.log`: expected hidden=true, actual=false | So sánh snapshot đầy đủ geometry, system, location, ngày và reserve trước publish; vẫn giữ request version + AbortController. |
| P0 | GTI request và bóng che có thể dùng góc khác nhau nếu form chưa đồng bộ | `before-orientation.log`: request tilt=30, scene tilt=0 | Request lấy tilt/azimuth từ scene; đồng bộ góc form không phụ thuộc các trường inverter không liên quan. |
| P0 | Thiếu ID/position/dimensions/normal trong scene contract; test cũ chưa đi qua ô renderer dùng thật | `before-simulation.log`: thiếu `scene.panels`, `renderCells` | Thêm descriptor panel; `renderCells` sinh chính các polygon/flag dùng để vẽ; forecast có callback trace theo bước. Không thay arithmetic điện năng. |
| P0 | Validation scene/sun chưa chặn rõ dữ liệu không hữu hạn | Guard bổ sung trong scene/exposure, có test NaN | Reject dữ liệu không hữu hạn trước ray tracing. Đây là hardening đầu vào, không suy luận rằng UI hợp lệ trước đây cho kWh sai. |
| P1 | Gợi ý hiện hữu chấm điểm hình học, không phải kWh năm, và áp dụng ngay | Source `optimize`/rows; baseline tests mong chờ áp dụng ngay | Giữ scorer cũ, thêm preview/confirm/cancel; thêm prototype kWh năm riêng dùng energy engine hiện tại. |
| P1 | Chưa có tập thời tiết năm | Proxy chỉ hỗ trợ dải ngày ngắn | Kịch bản bức xạ năm do người dùng nhập, ghi nhãn giả định rõ; không nhân dự báo một ngày thành một năm và không gọi nó là TMY. |

## Contract geometry và giới hạn chứng minh

`PanelGeometry.scene(config, positions)` tạo snapshot gồm `panels`, `buildings`, `roofs`, `roofFaces`, `volumes`. Mỗi panel có `id`, `position` (tâm world), `dimensions` (kích thước module chưa nghiêng), `azimuth`, `tilt`, `rotation` ngang/dọc, `normal` đơn vị và `vertices`. `modules` được giữ làm alias các vertices để tương thích. ID là 1-based theo thứ tự tấm trong snapshot, không phải UUID phần cứng; xếp lại có thể gán lại thứ tự.

Nhà chính cao `(floors + 1) × 3.2 m`; nhà bên cao `floors × 3.2 m`, rộng 8 m theo mô hình cũ. Mái Thái cao thêm 3 m, đua mái 0.5 m. Các mặt render và volume che dùng các thông số này từ cùng scene.

Renderer dùng `renderCells(scene, sun, grid)`; forecast dùng `exposure` trên cùng scene, cùng grid. Default 6×6. `shadeFraction` chỉ có nghĩa khi mặt pin đón nắng trực tiếp; dưới chân trời hoặc quay khỏi nắng trả `null`, `litFraction=0`. Không diễn giải hai trường hợp này là che bởi nhà bên 100%.

Test so cùng timestamp thực (giữa bước), không so trực tiếp mẫu tức thời với trung bình một giờ. Bộ test mới có:

- 3 độ phân giải (3×3, 6×6, 10×10) × 4 địa điểm/ngày mùa × 4 mốc địa phương 06:30, 09:00, 12:00, 16:30; 2 tấm mỗi trường hợp. Bao gồm ngày đêm vùng cực.
- Cùng input cho kết quả tái lập; fraction hữu hạn trong [0,1] khi có nghĩa; không có NaN.
- Không nhà bên, nhà cao, dịch một tấm (tấm còn lại không đổi), quay đồng thời nhà/hướng nắng.
- Một oracle độc lập dùng giao tia–tam giác trên các mặt mái/tường world, không gọi thuật toán giao convex volume của engine: 3 hướng nhà × 2 loại mái × 3 độ cao nắng × 72 ô = 1.296 tia.
- `Energy.onSample` báo timestamp, exposure, direct irradiance, công suất DC/MPPT/AC và clipping để test giới hạn mỗi bước. Không thêm callback trong chạy thông thường nên không lưu cả năm trace trong bộ nhớ.

Sai lệch shade fraction lớn nhất ở bộ cùng timestamp: **0 điểm phần trăm**, dưới ngưỡng 2 pp. Kết quả này kiểm chứng geometry và dữ liệu ô render, không chứng nhận screenshot trên Chrome, màu/ánh sáng toàn bộ mái hay sản lượng đo.

## Energy validation

Giữ nguyên chuỗi tính: DC từ GTI → bóng che trực tiếp → nhiệt độ/dây/bụi/khác → MPPT → hiệu suất inverter → clipping AC. Test kiểm tra raw DC bằng AC cộng toàn bộ tổn thất; mất trực tiếp + diffuse được bảo toàn; cloud/rain không tự trừ lần hai; giới hạn MPPT dòng/điện áp và AC áp dụng từng bước, không trên trung bình ngày.

Phân biệt **PV DC lắp đặt vượt giới hạn tiếp nhận inverter** (từ chối cấu hình, giữ behavior cũ) với **công suất chuyển đổi vượt AC định mức** (clipping từng bước). Không âm thầm chuyển giới hạn lắp đặt thành cơ chế clipping mới.

`onSample` chứng minh direct irradiance = 0 dưới chân trời, kể cả DNI đầu vào > 0. GTI là trung bình giờ, phần dư diffuse vẫn giữ theo công thức hiện tại: điều này có thể cho công suất dư tại một bước ở rìa bình minh/hoàng hôn. Chưa có bằng chứng dữ liệu để thay đổi quy tắc phân bổ bức xạ giờ.

Test integration có phản hồi cũ về sau phản hồi mới, geometry đổi không sự kiện, các trường inverter/hao hụt phát input làm stale, góc form không đồng bộ, import/reload và thay nhà bên. Camera, theme và thời điểm mô phỏng không phải cấu hình dự báo hôm nay, nên không bắt tính lại chỉ vì các thao tác đó.

## Prototype bố trí năm

Mở **Gợi ý → Prototype bố trí theo kWh/năm → So sánh bố trí theo năm**. Nhập bức xạ trên mặt pin (mặc định 1.600 kWh/m²/năm là giả định, không phải dữ liệu địa điểm) và khe tối thiểu (mặc định 0.02 m).

`AnnualPlacement.scenario` tạo 12 ngày giữa tháng, gia quyền số ngày tháng (cả năm nhuận); dạng bức xạ theo độ cao nắng, tỷ trọng trực tiếp/tán xạ giả định 80/20 trước chiếu lên mặt pin, chuẩn hóa đúng tổng POA người dùng nhập. Dữ liệu này đi qua nguyên công thức `Energy.estimateSystem`. Contract `scenario.days` là các block `{hourly,start,end,weight}`; có thể thay bằng dữ liệu năm thực ở bước phát triển tiếp theo nhưng UI chưa nhập TMY.

`candidates` sinh tâm tấm trên lưới 1 m cho hai tư thế ngang/dọc, bổ sung vị trí thủ công và bố trí pack hiện hữu. Footprint được nới kích thước để chừa khe, đồng thời bảo thủ chừa khe/2 tại mép mái. Tôn trọng số tấm yêu cầu và trần 30; không tự giảm số tấm trong prototype nếu không đủ chỗ.

Mỗi vị trí được chấm DC kWh/năm và năng lượng mất do che / DC ban đầu. Tìm kiếm greedy với tối đa 8 điểm khởi đầu; mọi bố trí đủ tấm được tính lại AC cả hệ thống với MPPT và clipping. Giữ baseline nếu baseline đáp ứng khe và không có đề xuất tốt hơn. Nếu baseline không đạt khe mới, có thể cần một bố trí AC thấp hơn; UI hiển thị chênh lệch có dấu để người dùng quyết định.

Preview có mặt bằng hiện tại/đề xuất, tổng AC kWh/năm, tổn thất che, top 10 vị trí xếp hạng. Chỉ **Áp dụng đề xuất** mới ghi bố trí; Cancel/Escape giữ nguyên. Cấu hình đổi trong lúc tìm hoặc trước xác nhận sẽ từ chối kết quả cũ. Các gợi ý hình học cũ và xếp hàng MPPT cũng qua bước preview/confirm.

## Kết quả test trước/sau và CI

| Giai đoạn | Kết quả / log |
|---|---|
| Baseline trước sửa engine | `baseline-test.log`, `baseline-build.log`: bộ hiện hữu pass. Không suy ra các contract mới đã được kiểm chứng. |
| Acceptance mới trước implementation | `before-simulation.log`: 3 nhóm pass, 2 nhóm fail vì thiếu contract. `before-placement.log`: chưa có module prototype. |
| Lỗi tái hiện trước sửa | `before-race.log`, `before-orientation.log`: fail đúng snapshot guard và góc request. |
| Sau sửa | `after-ci.log`: `bun run test:ci` = toàn bộ test + build/bundle + performance. `after-simulation.log`: 6 nhóm pass, max difference 0 pp. |

CI mới: `.github/workflows/regression.yml`, push/PR, Bun 1.3.14 (phiên bản đã chạy local), read-only repository permission, không deploy. Lệnh tái lập: `bun run test:ci`. Bộ test không cần thời tiết trực tiếp; Redis/HTTP upstream dùng mock hoặc local fixture. CI workflow chưa chạy trên GitHub từ workspace này. Docker hiện đặt Bun 1.4.4 và được giữ nguyên; không tuyên bố đã test image/runtime đó. `test:redis` với Redis thật chưa chạy.

## Giới hạn còn lại

1. Lấy mẫu diện tích 6×6 và thời gian 15 phút không phải giao polygon bóng chính xác; test 2 pp đo consistency cùng độ phân giải, không đo sai số vật lý tuyệt đối.
2. Chưa xét tự che giữa các tấm, che bầu trời diffuse, phản xạ địa hình, bypass diode, mismatch chuỗi hoặc bóng giàn đỡ. Mái/tường chủ yếu dùng shading thẩm mỹ; không có mô hình chiếu sáng vật lý đầy đủ cho toàn cảnh.
3. Nhiệt độ là tỷ lệ hao hụt cố định, không phải mô hình nhiệt tế bào. MPPT phân tấm round-robin, dùng điện áp giả định chung, không có Voc/Isc/đấu nối chuỗi. Hybrid chưa tính SOC/sạc/xả, điện tự dùng và giới hạn phát lưới.
4. Hướng/nghiêng chung cho các tấm; rotation chỉ đổi ngang/dọc. IDs không phải định danh bền vững xuyên mọi lần sắp xếp.
5. Prototype năm giữ hướng/nghiêng, dùng bức xạ giả định, 12 ngày đại diện; chưa phải dự báo khí hậu, tối ưu toàn cục, thiết kế kết cấu/PCCC/lối đi. Lưới 1 m có thể bỏ sót vị trí tốt; thời gian chạy tăng theo số ứng viên.
6. Chưa QA trực quan trên Chrome/mobile, chưa gọi API thời tiết thực, chưa đối chiếu kWh công tơ. Chuỗi tiếng Việt mới chưa có bộ dịch tiếng Anh đầy đủ.
