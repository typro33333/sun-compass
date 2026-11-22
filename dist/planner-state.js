(function(root) {
  const key='sol-planner-v1';
  const limits={width:[8,30],length:[8,30],count:[1,12,true],roof:[0,1,true],bearing:[0,360],tilt:[0,90],floors:[0,3,true],x:[-15,15],z:[-15,15],house:[0,360],left:[0,5,true],right:[0,5,true],leftRoof:[0,1,true],rightRoof:[0,1,true]};
  const inRange=(value,min,max,integer=false)=>typeof value==='number' && Number.isFinite(value) && value>=min && value<=max && (!integer || Number.isInteger(value));
  function validate(value) {
    if(!value || value.version!==1 || !value.config)return null;
    const config={};
    const input={width:8,...value.config};
    for(const [name,range] of Object.entries(limits)) {
      if(!inRange(input[name],...range))return null;
      config[name]=input[name];
    }
    if(!Array.isArray(value.positions) || value.positions.length!==config.count || value.positions.some(p=>!p || !inRange(p.x,-15,15) || !inRange(p.z,-15,15)))return null;
    const positions=value.positions.map(({x,z})=>({x,z}));
    if(!root.PanelGeometry.validPlacement(positions,config.bearing-config.house,config.length,config.width))return null;
    const state={version:1,config,positions};
    const view=value.view;
    if(view && inRange(view.yaw,-1e6,1e6) && inRange(view.pitch,.05,Math.PI/2) && inRange(view.zoom,.5,4))state.view={yaw:view.yaw,pitch:view.pitch,zoom:view.zoom};
    const location=value.location;
    if(location && inRange(location.lat,-90,90) && inRange(location.lon,-180,180) && inRange(location.offset,-12,14) && Number.isInteger(location.offset*4))state.location={lat:location.lat,lon:location.lon,offset:location.offset};
    const energy=value.energy;
    if(energy && inRange(energy.kwp,.1,100000) && inRange(energy.loss,0,80) && typeof energy.reserve==='boolean')state.energy={kwp:energy.kwp,loss:energy.loss,reserve:energy.reserve};
    return state;
  }
  function load(storage) {try{return validate(JSON.parse(storage.getItem(key)));}catch{return null;}}
  function save(storage,value) {
    try {const state=validate(value);if(!state)return false;storage.setItem(key,JSON.stringify(state));return true;}catch{return false;}
  }
  const backupFormat='sol-simulation-profile',maxBackupBytes=65536;
  function backupState(value) {
    const state=validate(value);
    if(!state || ['view','location','energy'].some(name=>value[name]!==undefined && !state[name]))throw Error('Profile không hợp lệ hoặc có thông số ngoài giới hạn.');
    if(!root.PanelGeometry.validPlacement(state.positions.map(p=>({x:p.x+state.config.x,z:p.z-state.config.z})),state.config.bearing-state.config.house,state.config.length,state.config.width))throw Error('Vị trí pin vượt mép mái.');
    return state;
  }
  function exportBackup(value) {
    return JSON.stringify({format:backupFormat,version:1,exportedAt:new Date().toISOString(),profile:backupState(value)},null,2);
  }
  function importBackup(text) {
    if(typeof text!=='string' || text.length>maxBackupBytes)throw Error('File sao lưu vượt giới hạn 64 KB.');
    let data;
    try {data=JSON.parse(text.replace(/^\uFEFF/,''));}catch {throw Error('File không phải JSON hợp lệ.');}
    if(!data || data.format!==backupFormat || data.version!==1)throw Error('File không đúng định dạng profile Sol hoặc phiên bản chưa hỗ trợ.');
    return backupState(data.profile);
  }
  root.PlannerState={key,validate,load,save,exportBackup,importBackup,maxBackupBytes};
  if (typeof module !== 'undefined') module.exports = root.PlannerState;
})(typeof window !== 'undefined' ? window : globalThis);
