import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('dist/index.html',root),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'HTML IDs must be unique');
const server=fs.readFileSync(new URL('server.js',root),'utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1]);
for(const file of [...scripts,'style.css']){
  assert(fs.existsSync(new URL('dist/'+file,root)),`Missing asset ${file}`);
  assert(server.includes(`['/${file}', '${file}']`),`Missing route ${file}`);
}
for(const script of scripts){
  const source=fs.readFileSync(new URL('dist/'+script,root),'utf8');
  for(const match of source.matchAll(/(?:\$|getElementById)\('([^']+)'\)/g)){
    assert(ids.includes(match[1]),`Missing DOM element ${match[1]} in ${script}`);
  }
}
assert(scripts.indexOf('forecast-client.js')<scripts.indexOf('app.js'));
assert(scripts.indexOf('energy-ui.js')<scripts.indexOf('startup.js'));
console.log('Static app checks passed: unique IDs, asset routes, DOM references and startup order.');
