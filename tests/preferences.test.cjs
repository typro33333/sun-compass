const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync(require.resolve('../dist/app.js'),'utf8');
for(const minutes of [-420,-345,240,0]) {
 const nodes=new Map(),storage=new Map([['sol-utc-offset','7']]);
 const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',addEventListener(k,fn){this[k]=fn;},checkValidity:()=>true});return nodes.get(id);};
 let clientMinutes=minutes;
 class ClientDate extends Date {getTimezoneOffset(){return clientMinutes;}}
 const ctx=vm.createContext({document:{getElementById:get},Date:ClientDate,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},stop(){},refresh(){}});
 vm.runInContext(app.slice(0,app.indexOf('const fmt=')),ctx);
 assert.equal(Number(get('timezone').value),-minutes/60,'Auto mode must ignore legacy UTC+7');
 vm.runInContext(app.slice(app.indexOf("$('timezone').addEventListener"),app.indexOf("$('now').onclick=")),ctx);
 get('timezone').value='5.5';get('timezone').change();assert.equal(storage.get('sol-timezone-mode'),'manual');
 clientMinutes=-60;vm.runInContext('setCurrentTime()',ctx);assert.equal(Number(get('timezone').value),5.5);
 get('timezone-auto').click();assert.equal(Number(get('timezone').value),1);assert.equal(storage.get('sol-timezone-mode'),'auto');
}
for(const [file,title,en] of [['panel-dimensions.html','Hướng Nắng — Kích thước tấm pin','Hướng Nắng — Panel dimensions'],['system-sizing.html','Hướng Nắng — Gợi ý hệ thống theo nhu cầu','Hướng Nắng — System sizing by demand']]) {
 const html=fs.readFileSync(require.resolve('../dist/'+file),'utf8');
 assert(html.includes('id="language-select"'));assert(html.includes('src="i18n.js"'));
 const picker={addEventListener(k,fn){this[k]=fn;}},text={nodeType:3,nodeValue:title.slice('Hướng Nắng — '.length)};
 const document={title,documentElement:{},body:{nodeType:1,tagName:'BODY',hasAttribute:()=>false,childNodes:[text]},getElementById:()=>picker};
 const saved=new Map([['sol-language','en']]);
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/i18n.js'),'utf8'),{document,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},MutationObserver:class{observe(){}disconnect(){}}});
 assert.equal(document.title,en);assert.equal(document.documentElement.lang,'en');
 assert.equal(text.nodeValue,en.slice('Hướng Nắng — '.length));
 picker.change({target:{value:'vi'}});assert.equal(document.title,title);assert.equal(text.nodeValue,title.slice('Hướng Nắng — '.length));assert.equal(saved.get('sol-language'),'vi');
}
console.log('Preferences passed: client UTC offsets, legacy defaults, manual/reset mode, shared language and page titles.');
