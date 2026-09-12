import * as THREE from 'three';
const GOOD=['#982d67','#e65a48','#f5ce56','#65c885','#168fab'];
const BAD=['#168fab','#65c885','#f5ce56','#e65a48','#982d67'];
const rows=[
 ['traffic','Traffic','Road congestion','Free flow','Gridlock','network'],
 ['landvalue','Land value','Where your city is most desirable','Low value','High value','terrain'],
 ['pollution','Pollution','Ground and airborne pollution','Clean','Polluted','terrain'],
 ['happiness','Happiness','Local quality of life','Unhappy','Happy','building'],
 ['education','Education','Access to learning','Unserved','Educated','building'],
 ['health','Health','Access to healthcare','Unserved','Healthy','building'],
 ['fire','Fire safety','Local fire risk','Safe','Hazard','building'],
 ['crime','Crime','Local crime risk','Safe','Crime','building'],
 ['power','Electricity','Electricity supply and coverage','Unpowered','Powered','terrain'],
 ['water','Water','Water supply and coverage','Dry','Supplied','terrain'],
 ['garbage','Garbage','Waste awaiting collection','Clean','Piling up','terrain'],
 ['density','Population density','Residents per hectare of footprint','0 / ha','2,500 / ha','building'],
];
export const VIEWS=rows.map(([id,label,description,min,max,kind])=>({id,label,description,min,max,kind,unit:id==='density'?'res/ha':'%',colors:[...(id==='landvalue'?['#261527','#622041','#df612f','#f6e294','#169dab']:['pollution','fire','crime','garbage'].includes(id)?BAD:GOOD)]}));
export const BY_ID=Object.fromEntries(VIEWS.map(v=>[v.id,v]));
const ramps=Object.fromEntries(VIEWS.map(v=>[v.id,v.colors.map(c=>new THREE.Color(c))]));
export function color(id,v,out=new THREE.Color()){const p=Math.max(0,Math.min(1,v))*4,i=Math.min(3,Math.floor(p));return out.copy(ramps[id][i]).lerp(ramps[id][i+1],p-i);}
export const SOURCES=[['power_coal',-380,340],['water_pump',250,-330],['clinic',-80,120],['school',120,60],['police',-200,-180],['fire',300,220],['park_large',-120,-300],['landfill',420,380]];
export const ICONS=[
 'M4 8h16M4 16h16M8 4v16m8-16v16', 'M3 19l6-9 4 4 8-11M15 3h6v6',
 'M5 20V10h5v5l5-5v10M8 7c-4-4 6-3 2-6m6 7c-4-4 6-3 2-6',
 'M7 9h.1M17 9h.1M7 15q5 7 10 0M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20',
 'M2 8l10-5 10 5-10 5zM6 11v6q6 5 12 0v-6m4-3v9',
 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
 'M12 2c4 8-2 7 4 10l2-4q9 14-6 14Q0 21 7 10q-1 7 5-8',
 'M12 2l9 4v6q-1 7-9 10Q4 19 3 12V6zM8 12l3 3 5-6',
 'M14 2L5 14h7l-2 8 9-13h-7z',
 'M12 2Q-4 21 12 22Q28 21 12 2zM7 15q0 4 4 4',
 'M5 6h14l-1 15H6zM3 6h18M9 6V3h6v3M9 10v7m6-7v7',
 'M3 21V11h5v10m1 0V3h6v18m1 0V8h5v13M1 21h22',
];
