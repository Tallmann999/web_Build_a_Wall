const fs=require('node:fs');
const {Game,LEVELS,dist}=require('./engine.js');
function run(mode,seed){
 const g=new Game({seed});
 for(let i=0;i<1200*60&&g.state==='playing';i++){
  let input={};
  if(g.phase==='build'){
   const w=g.walls.find(w=>!w.built),p={x:w.x,y:175};
   if(dist(g.player,w)>70)input={x:p.x-g.player.x,y:p.y-g.player.y};
   else if(g.money+1e-7>=20)g.construct(w.id);
  }else if(mode!=='idle'&&!g.job){
   const ids=[...g.monsters.filter(m=>!m.breached).map(m=>m.target),...(g.phase==='prep'?g.forecast():[]),...g.walls.slice().sort((a,b)=>a.level-b.level).map(w=>w.id)];
   const damaged=g.monsters.filter(m=>!m.breached).map(m=>g.walls[m.target]).filter(w=>w.hp>0&&w.hp<LEVELS[w.level].hp*.85).sort((a,b)=>a.hp/LEVELS[a.level].hp-b.hp/LEVELS[b.level].hp)[0];
   if(mode==='upgrade'||mode==='mixed'){
    const maxLevel=Math.min(4,2+Math.floor(g.wave/2));
    const w=ids.map(id=>g.walls[id]).find(w=>(w.hp<=0||w.level<maxLevel)&&!g.locked(w.id)&&g.money>=LEVELS[w.hp<=0?w.level:w.level+1].price);
    if(w)g.upgrade(w.id);
   }
   if(!g.job&&damaged&&(mode==='repair'||mode==='mixed')){
    const p={x:damaged.x,y:damaged.y+55},d=dist(g.player,p);
    if(d>4)input={x:(p.x-g.player.x)/d,y:(p.y-g.player.y)/d};else g.repair(damaged.id);
   }
  }
  g.step(1/60,input);
 }
 return {seed,strategy:mode,time:Math.round(g.time),result:g.state,wave:g.wave,kills:g.stats.kills,breaches:g.stats.breaks,core:g.core,spent:Math.round(g.stats.spent),repairHp:Math.round(g.stats.repairs),installs:g.stats.installs};
}
const results=[91,128,401,732].flatMap(seed=>['idle','repair','upgrade','mixed'].map(mode=>run(mode,seed)));
const report={version:'0.7',note:'All policies first walk to and purchase six empty sites for 20 dollars each, starting with 20 dollars. Every wall adds 5 dollars per second. First wave begins 10 seconds after construction; policies differ only after this shared building phase. Four automated policies on four seeds, not human playtests.',results};
fs.writeFileSync('work/balance-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(results,null,2));
