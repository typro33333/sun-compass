// Approximate solar geometry: NOAA General Solar Position Calculations.
(function(root){
 const R=Math.PI/180;
 function position(day,minute,lat,lon,offset){
  const date=new Date(day+'T12:00:00Z'), year=date.getUTCFullYear();
  const n=(date-Date.UTC(year,0,1))/86400000+0.5;
  const days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
  const g=2*Math.PI/days*(n-1+(minute/60-12)/24);
  const eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  const dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  const h=(((minute+eq+4*lon-60*offset)%1440+1440)%1440/4-180)*R;
  const p=lat*R;
  const altitude=Math.asin(Math.max(-1,Math.min(1,Math.sin(p)*Math.sin(dec)+Math.cos(p)*Math.cos(dec)*Math.cos(h))))/R;
  const azimuth=(Math.atan2(Math.sin(h),Math.cos(h)*Math.sin(p)-Math.tan(dec)*Math.cos(p))/R+180+360)%360;
  return {altitude,azimuth};
 }
 function events(day,lat,lon,offset){
  let rise=null,set=null,above=0;let prev=position(day,0,lat,lon,offset).altitude+0.833;
  for(let m=1;m<=1440;m++){const v=position(day,m,lat,lon,offset).altitude+0.833;if(v>=0)above++;if(prev<0&&v>=0)rise=m-1+(-prev)/(v-prev);if(prev>=0&&v<0)set=m-1+(-prev)/(v-prev);prev=v;}
  return {rise,set,daylight:above};
 }
 root.Solar={position,events};
 if(typeof module!=='undefined')module.exports=root.Solar;
})(typeof window!=='undefined'?window:globalThis);
