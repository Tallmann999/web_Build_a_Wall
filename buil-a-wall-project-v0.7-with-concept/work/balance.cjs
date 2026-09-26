const fs=require('node:fs');
const {Game,MAX_WAVES,WAVE_COUNTS,LEVELS,INCOME_UPGRADE_PRICE,DAMAGE_UPGRADE_PRICE,dist}=require('./engine.js');
function run(mode,seed){
 const g=new Game({seed}),waves=[];
 for(let i=0;i<2400*60&&g.state==='playing';i++){
  let input={};
  if(g.phase==='build'){
   const w=g.walls.find(w=>!w.built),p={x:w.x,y:175};
   if(dist(g.player,w)>70)input={x:p.x-g.player.x,y:p.y-g.player.y};
   else if(g.money+1e-7>=20)g.construct(w.id);
  }else if(mode!=='idle'&&!g.job){
   const ids=[...g.monsters.filter(m=>!m.breached).map(m=>m.target),...(g.phase==='prep'?g.forecast():[]),...g.walls.slice().sort((a,b)=>a.level-b.level).map(w=>w.id)];
   const damaged=g.walls.filter(w=>w.hp>0&&w.hp<LEVELS[w.level].hp-1e-7).sort((a,b)=>a.hp/LEVELS[a.level].hp-b.hp/LEVELS[b.level].hp)[0];
   // The shop button in the UI moves the engineer here instantly as well.
   if((mode==='developed'||mode==='explorer')&&g.walls.every(w=>w.level>=3&&w.hp>0)&&g.money>=INCOME_UPGRADE_PRICE+3000&&!g.incomeUpgraded){g.player={x:g.shop.x+28,y:g.shop.y+15};g.upgradeIncome();}
   if((mode==='developed'||mode==='explorer')&&g.walls.every(w=>w.level>=4&&w.hp>0)&&g.money>=DAMAGE_UPGRADE_PRICE+8500&&!g.damageUpgraded){g.player={x:g.shop.x+28,y:g.shop.y+15};g.upgradeDamage();}
   if(mode==='upgrade'||mode==='mixed'||(mode==='developed'||mode==='explorer')){
    const maxLevel=Math.min(5,2+Math.floor(g.wave/2));
    const w=ids.map(id=>g.walls[id]).find(w=>(w.hp<=0||w.level<maxLevel&&w.hp>=LEVELS[w.level].hp-1e-7)&&!g.locked(w.id)&&g.money>=LEVELS[w.hp<=0?w.level:w.level+1].price);
    if(w){if(dist(g.player,w)>80)input={x:w.x-g.player.x,y:w.y+55-g.player.y};else g.upgrade(w.id);}
   }
   if(!g.job&&!input.x&&!input.y&&damaged&&(mode==='repair'||mode==='mixed'||(mode==='developed'||mode==='explorer'))){
    const p={x:damaged.x,y:damaged.y+55},d=dist(g.player,p);
    if(d>4)input={x:(p.x-g.player.x)/d,y:(p.y-g.player.y)/d};else g.repair(damaged.id);
   }
   if(mode==='explorer'&&!g.job&&!input.x&&!input.y){const chest=g.chests.filter(c=>g.monsters.every(m=>dist(m,c)>80)).sort((a,b)=>dist(g.player,a)-dist(g.player,b))[0];if(chest)input={x:chest.x-g.player.x,y:chest.y-g.player.y};}
  }
  const waveBefore=g.wave;g.step(1/60,input);
  if(g.wave!==waveBefore)waves.push({wave:g.wave,money:Math.round(g.money),wallLevels:g.walls.map(w=>w.level),incomeUpgraded:g.incomeUpgraded,damageUpgraded:g.damageUpgraded});
 }
 return {seed,strategy:mode,time:Math.round(g.time),result:g.state,wave:g.wave,kills:g.stats.kills,breaches:g.stats.breaks,core:g.core,spent:Math.round(g.stats.spent),repairHp:Math.round(g.stats.repairs),installs:g.stats.installs,chests:g.stats.chests,chestEarned:g.stats.chestEarned,incomeUpgraded:g.incomeUpgraded,damageUpgraded:g.damageUpgraded,waves};
}
const seeds=[91,128,401,732,17,29,53,89,144,233,377,610,987,1597,2026,4096,8191,12345,31415,65535];
const modes=['idle','repair','upgrade','mixed','developed','explorer'];
const results=seeds.flatMap(seed=>modes.map(mode=>run(mode,seed)));
const summary=modes.map(strategy=>{const runs=results.filter(r=>r.strategy===strategy),wins=runs.filter(r=>r.result==='won');return {strategy,wins:wins.length,runs:runs.length,averageSeconds:Math.round(runs.reduce((a,r)=>a+r.time,0)/runs.length),averageChestIncome:Math.round(runs.reduce((a,r)=>a+r.chestEarned,0)/runs.length),minWave:Math.min(...runs.map(r=>r.wave)),maxWave:Math.max(...runs.map(r=>r.wave))};});
const report={version:'0.14',maxWaves:MAX_WAVES,waveCounts:WAVE_COUNTS,note:'Six automated policies on twenty fixed seeds, starting with $20 and constructing six walls through normal movement. No extra money or combat-stat overrides. Upgrade and mixed buy wall tiers; developed also buys the optional income and damage upgrades with a reserve. Bots react every simulation step; these results are a balance regression check, not human win-rate predictions.',summary,results};
fs.writeFileSync('work/balance-results.json',JSON.stringify(report,null,2));console.table(summary);
if(results.some(r=>r.result==='playing'))throw Error('Balance run timed out');
