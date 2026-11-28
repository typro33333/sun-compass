// Render the selected household example on the server, then let the form update it in place.
export async function renderSizingPage(response, url, calculator) {
  const query=new URL(url).searchParams;
  const day=Number(query.get('day')??20),night=Number(query.get('night')??30);
  if(![day,night].every(v=>Number.isFinite(v)&&v>=0&&v<=10000)||day+night===0)return response;
  const input={day,night,watts:600,yieldPerKwp:4,coverage:100};
  const calculation=await calculator.handle(new Request('http://local/api/calc/sizing',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)
  }),'sizing');
  if(!calculation.ok)return response;
  const r=await calculation.json();
  const html=new HTMLRewriter();
  for(const [id,value] of Object.entries({'sizing-day':day,'sizing-night':night})){
    html.on('#'+id,{element(e){e.setAttribute('value',String(value));}});
  }
  for(const [id,value] of Object.entries({'sizing-pv':r.panels+' tấm · '+r.pvKwp.toFixed(2)+' kWp','sizing-inverter':r.inverterKw+' kW'+(r.batteryKwh?' · Hybrid':''),'sizing-battery':r.batteryKwh+' kWh'})){
    html.on('#'+id,{element(e){e.setInnerContent(value);}});
  }
  response.headers.delete('Content-Length');
  return html.on('#sizing-result',{element(e){
    e.removeAttribute('hidden');
    e.setAttribute('data-initial',JSON.stringify({input,result:r}));
  }}).transform(response);
}
