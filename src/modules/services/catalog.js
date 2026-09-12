// Owned catalog: UI labels/costs are copied from the public contract, without importing the UI.
const rows = [
['power_coal','Coal Power Plant','electricity','power',72,48,32000,480,{power:600},null],
['power_wind','Wind Turbine','electricity','power',24,24,8000,90,{power:60},null],
['power_solar','Solar Plant','electricity','power',64,64,24000,180,{power:220},null],
['water_pump','Water Pump Station','water','water',32,24,9000,140,{water:400},null],
['sewage','Sewage Outlet','water','water',40,24,7000,110,{sewage:400},null],
['landfill','Landfill Site','garbage','garbage',96,72,11000,90,{garbage:500},null],
['incinerator','Incinerator','garbage','incinerator',48,40,38000,420,{garbage:700,power:120},null],
['clinic','Medical Clinic','health','healthcare',28,20,12000,200,{people:1200},340],
['hospital','Hospital','health','hospital',64,44,45000,700,{people:5000},720],
['school','Elementary School','education','education',56,44,14000,260,{people:900},420],
['high_school','High School','education','education',72,52,26000,420,{people:1400},620],
['university','University','education','university',120,80,60000,900,{people:2400},1100],
['police','Police Station','police','police',36,28,11000,240,{people:1500},480],
['fire','Fire House','fire','fire',32,28,10000,220,{people:1500},460],
['park_small','Small Park','parks','parks',40,40,3000,40,{},180],
['park_large','Large Park','parks','large_parks',96,96,12000,150,{},380],
['plaza','Plaza','parks','plazas',48,48,8000,90,{},220],
];
export const CATALOG = Object.freeze(Object.fromEntries(rows.map(([kind,label,category,unlock,w,d,cost,upkeep,capacity,radius]) => [kind,Object.freeze({label,category,unlock,footprint:Object.freeze({w,d}),cost,upkeep,capacity:Object.freeze(capacity),radius,output:Object.values(capacity).reduce((a,b)=>Math.max(a,b),0)})])));
export const KINDS = Object.keys(CATALOG);
export const CATEGORIES = ['power','water','sewage','garbage'];
export const CIVIC = KINDS.filter(k=>CATALOG[k].radius !== null);
export const GRID_KEYS = [...CATEGORIES,...CIVIC];
export const PRIMARY = {power_coal:'power',power_wind:'power',power_solar:'power',water_pump:'water',sewage:'sewage',landfill:'garbage',incinerator:'garbage'};
export function capacity(item,category,ctx) {
 let n=CATALOG[item.kind]?.capacity[category]||0;
 if(item.kind==='power_wind') n*=Math.max(.15,Math.min(1,(ctx.world.weather.wind?.speed||0)/8));
 if(item.kind==='power_solar') n*=Math.max(0,Math.sin(ctx.clock.sunElevation()));
 if(item.kind==='water_pump' && item.waterDistance>60) n*=.35;
 return n;
}
