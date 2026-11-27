(() => {
  const toggle=document.getElementById('header-menu-toggle');
  const actions=document.getElementById('header-actions');
  const close=()=>{actions.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');};
  toggle.addEventListener('click',()=>toggle.setAttribute('aria-expanded',String(actions.classList.toggle('is-open'))));
  document.addEventListener('click',event=>{if(!actions.contains(event.target)&&!toggle.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){close();toggle.focus();}});
  actions.querySelectorAll('a').forEach(link=>{if(link.pathname===location.pathname.replace(/\/$/,''))link.setAttribute('aria-current','page');});
  const catalog=document.getElementById('module-catalog-body');
  if(catalog)catalog.innerHTML=PanelGeometry.moduleCatalog.map(m=>`<tr><td>${m.min}–${m.max} W</td><td>${Math.round(m.length*1000)} × ${Math.round(m.width*1000)} mm</td><td><a href="${m.source}" target="_blank" rel="noreferrer">${m.model}</a></td></tr>`).join('');
})();
