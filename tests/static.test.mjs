import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('dist/compass.html',root),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'HTML IDs must be unique');
const server=fs.readFileSync(new URL('server.js',root),'utf8');
assert(server.includes("['/sol-calculator', 'compass.html']"));
assert(server.includes("['/sol-calculator/', 'compass.html']"));
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1]);
for(const file of [...scripts,'style.css','favicon.svg']){
  assert(fs.existsSync(new URL('dist/'+file,root)),`Missing asset ${file}`);
  assert(server.includes(`['/${file}', '${file}']`),`Missing route ${file}`);
}
for(const script of scripts){
  const source=fs.readFileSync(new URL('dist/'+script,root),'utf8');
  const generatedIds=[...source.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  for(const match of source.matchAll(/(?:\$|getElementById)\('([^']+)'\)/g)){
    assert(ids.includes(match[1]) || generatedIds.includes(match[1]),`Missing DOM element ${match[1]} in ${script}`);
  }
}
assert(scripts.indexOf('forecast-client.js')<scripts.indexOf('app.js'));
assert(scripts.indexOf('energy-ui.js')<scripts.indexOf('startup.js'));
console.log('Static app checks passed: unique IDs, asset routes, DOM references and startup order.');
for(const [route,file,contentId] of [['/system-sizing','system-sizing.html','sizing-form'],['/panel-dimensions','panel-dimensions.html','module-catalog-body']]) {
  const page=fs.readFileSync(new URL('dist/'+file,root),'utf8');
  assert(server.includes(`['${route}', '${file}']`));
  assert(server.includes(`['${route}/', '${file}']`));
  assert(page.includes(`id="${contentId}"`));
  assert(!html.includes(`id="${contentId}"`),'Moved content must not remain in calculator');
  assert(html.includes(`href="${route}"`));
  const pageIds=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(pageIds).size,pageIds.length);
  for(const [,script] of page.matchAll(/<script src="([^"]+)"/g)) {
    assert(fs.existsSync(new URL('dist/'+script,root)));
    assert(server.includes(`['/${script}', '${script}']`));
  }
  assert(!page.includes('src="app.js"'),'Standalone pages must not initialize simulation or GPS');
}
console.log('Separate sizing/catalog pages passed: routes, links, assets, unique IDs and isolated content.');
