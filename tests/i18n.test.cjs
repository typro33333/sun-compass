const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../dist/i18n.js'),'utf8');
const decode=s=>s.replace(/&nbsp;/g,'\u00a0').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n));
function element(tag,attrs={}) {return {nodeType:1,tagName:tag.toUpperCase(),attrs,childNodes:[],hasAttribute(k){return k in this.attrs;},getAttribute(k){return this.attrs[k];},setAttribute(k,v){this.attrs[k]=String(v);},addEventListener(k,fn){this[k]=fn;}};}
function parse(html) {
 const root=element('body'),stack=[root],ids=new Map();
 for(const token of html.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g)||[]) {
  if(token.startsWith('<!'))continue;
  if(token.startsWith('</')) {const tag=token.slice(2,-1).toUpperCase();if(stack.at(-1).tagName===tag)stack.pop();continue;}
  if(token.startsWith('<')) {
   const tag=token.match(/^<([^\s/>]+)/)[1],attrs={};
   for(const m of token.matchAll(/([\w-]+)="([^"]*)"/g))attrs[m[1]]=decode(m[2]);
   const node=element(tag,attrs);stack.at(-1).childNodes.push(node);if(attrs.id)ids.set(attrs.id,node);
   if(!['input','meta','link','img','br','hr','base','path','circle','line','rect','stop'].includes(tag)&&!token.endsWith('/>'))stack.push(node);
  }else stack.at(-1).childNodes.push({nodeType:3,nodeValue:decode(token)});
 }
 return {root,ids};
}
const hasVietnamese=s=>/[\p{M}đĐ]/u.test(s.replaceAll('Hướng Nắng','').normalize('NFD'));
const samples=[
 'Đã xếp 12 tấm thành hàng song song mép mái, hướng pin 90°, giữ độ nghiêng 15°. Các nhóm MPPT nằm liền nhau theo thứ tự hàng: MPPT 1: 6 tấm; MPPT 2: 6 tấm. Cách xếp ưu tiên hàng thẳng và gom nhóm, không tối ưu sản lượng theo nắng. Nhóm này dùng trong mô hình dự báo, chưa phải thiết kế đấu chuỗi điện.',
 'Với mái 8 × 10 m và 12 tấm, phương án chọn hướng 180° và nghiêng 15° vì đạt chỉ số đón nắng tốt nhất trong các phương án đã thử qua 12 ngày đại diện cho các tháng trong năm. Đã chuyển 3 tấm để sử dụng các vùng mái thuận lợi hơn. Phần đón nắng bị nhà bên che (có gia quyền theo góc nắng) thay đổi từ 30% thành 10%. Chỉ số đón nắng tăng 15%.',
 'Đang xếp hạng 12/30 vị trí…',
 'Đã đặt 6 tấm · Bố trí tự động tìm được chỗ cho 8 tấm trên mái 3 × 8 m. Có thể sắp xếp thủ công; chỉ nhận vị trí không chồng lấn, không vượt mái, tối đa 30 tấm.',
 '45° · Đông Bắc', '315° · Tây Bắc', '135° · Đông Nam',
 'Mặt phẳng sắp xếp pin, cửa chính ở phía trên',
 'Bố trí trên mái',
 '12 tấm × 600 W = 7.200 kWp · Dài 2384 × rộng 1134 mm · Model',
 '6 tấm · Tấm 2: ngang 1 m, dọc 2 m',
 'Nhiệt độ 0.12, dây dẫn 0.02, bụi 0.03, khác 0.00 kWh. Hiệu suất inverter 97%. Lấy dữ liệu lúc 12:00.',
 'DC lý tưởng 10 kWh → trừ bóng che 1 → hao hụt DC 1 → DC còn 8 kWh → MPPT mất 0 → chuyển đổi mất 1 → clipping AC 0 → AC 7 kWh',
 'Ngày 2026-11-27 · PV DC 13.8 kWp · Inverter AC 12 kW · UTC+7',
 'PV cần tạo 53.3 kWh/ngày, gồm điện ban ngày và điện sạc bù hao hụt. Cấu hình làm tròn tạo khoảng 55.2 kWh/ngày theo giả định. Lưu trữ cấp 30.0 kWh cho ban đêm; còn 0.0 kWh/đêm lấy từ lưới theo mục tiêu đã chọn.',
 'Không tải được dự báo. Hãy kiểm tra mạng và thử lại.',
 'Đã khôi phục profile và cập nhật mô hình 3D.',
 'Cập nhật cuối: 12:00 UTC · Dữ liệu lúc 11:00 UTC · Tọa độ 10,106 · ô thời tiết ~2 km',
 '6 giờ 30 phút', 'Tháng 11 năm 2026', 'BẮC · 0°', 'NAM · 180°', 'ĐÔNG · 90°', 'TÂY · 270°'
];
let total=0;
for(const file of ['index.html','panel-dimensions.html','system-sizing.html']) {
 const html=fs.readFileSync(require.resolve('../dist/'+file),'utf8'),{root,ids}=parse(html);
 let observer;const document={body:root,documentElement:{},title:html.match(/<title>(.*?)<\/title>/)[1],getElementById:id=>ids.get(id)};
 const ctx={document,localStorage:{getItem:()=> 'en',setItem(){}},MutationObserver:class{constructor(fn){observer=fn;}observe(){}disconnect(){}}};
 const originals=[];function collect(node) {
  if(node.nodeType===3){originals.push([node,'nodeValue',node.nodeValue]);return;}
  if(['SCRIPT','STYLE'].includes(node.tagName)||node.attrs.translate==='no')return;
  for(const k of ['aria-label','title','placeholder','aria-valuetext','alt'])if(node.hasAttribute(k))originals.push([node.attrs,k,node.attrs[k]]);
  node.childNodes.forEach(collect);
 }collect(root);
 vm.runInNewContext(source,ctx);
 const misses=originals.filter(([node,key])=>hasVietnamese(node[key]));
 assert.deepEqual(misses.map(([node,key])=>node[key]),[],file+' untranslated static content');
 const option=element('option',{value:'planner-house'});option.childNodes.push({nodeType:3,nodeValue:'Nhà chính & mái'});root.childNodes.push(option);
 observer([{type:'childList',addedNodes:[option]}]);assert.equal(option.childNodes[0].nodeValue,'Main house & roof');assert.equal(option.attrs.value,'planner-house');
 const dynamic=samples.map(s=>({nodeType:3,nodeValue:s}));root.childNodes.push(...dynamic);observer([{type:'childList',addedNodes:dynamic}]);
 assert.deepEqual(dynamic.filter(n=>hasVietnamese(n.nodeValue)).map(n=>n.nodeValue),[],'Untranslated dynamic results');
 for(const unchanged of ['Name','Month','MPPT','Solar panel','Hướng Nắng','23.5 kWh'])assert.equal(ctx.solText(unchanged),unchanged);
 ids.get('language-select').change({target:{value:'vi'}});
 for(const [node,key,value] of originals)assert.equal(node[key],value,'Vietnamese must restore original text');
 dynamic.forEach((n,i)=>assert.equal(n.nodeValue,samples[i]));
 ids.get('language-select').change({target:{value:'en'}});
 dynamic[0].nodeValue='Đã xếp tự động.';observer([{type:'characterData',target:dynamic[0]}]);assert.equal(dynamic[0].nodeValue,'Panels arranged automatically.');
 total+=originals.length;
}
console.log(`English coverage passed: ${total} static text/attributes, dropdowns, dynamic results, canvas labels and VI/EN round trips.`);
