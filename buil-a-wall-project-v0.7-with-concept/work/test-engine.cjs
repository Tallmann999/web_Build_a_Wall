const assert=require('node:assert/strict');
const {Game,MAX_WAVES,WAVE_COUNTS,FIELD_BOUNDS,fieldPoint,chestReward,LEVELS,dist}=require('./engine.js');
function readyGame(options={}){return new Game({prebuilt:true,startingMoney:150,...options});}
const tests=[];function test(name,fn){try{fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.message});}}
// Existing economy/job tests arrange the newly required proximity explicitly.
function upgradeNearby(g,id){g.player={x:g.walls[id].x,y:g.walls[id].y+55};return g.upgrade(id);}
function advance(g,seconds){for(let i=0;i<Math.round(seconds*60);i++)g.step(1/60);}
test('First titan appears at 10 seconds, never earlier',()=>{const g=readyGame();advance(g,9.9);assert.equal(g.wave,0);advance(g,.1);assert.equal(g.wave,1);assert.equal(g.monsters[0].level,1);assert.equal(g.phase,'battle');});
test('Six live level-one walls earn 30 dollars every two seconds',()=>{const g=readyGame();advance(g,10);assert.ok(Math.abs(g.money-300)<.001);g.walls[0].hp=0;assert.ok(Math.abs(g.income()-25)<.001);});
test('Shop requires proximity, money and an empty inventory',()=>{const g=readyGame();g.money=500;assert.equal(g.buy(2).ok,false);g.player={...g.shop};assert.equal(g.buy(2).ok,true);assert.equal(g.inventory,2);assert.equal(g.money,100);assert.equal(g.buy(2).ok,false);});
test('Installation upgrades one of six sections and consumes kit only at completion',()=>{const g=readyGame();g.inventory=2;g.player={...g.walls[0]};assert.equal(g.install(0).ok,true);advance(g,1);assert.equal(g.inventory,2);advance(g,1.1);assert.equal(g.inventory,null);assert.equal(g.walls[0].hp,600);assert.equal(g.walls.filter(w=>w.level===1).length,5);});
test('Attack lock blocks installation, including rubble',()=>{const g=readyGame();g.inventory=2;g.player={...g.walls[0]};g.walls[0].lastHit=g.time;assert.equal(g.install(0).ok,false);g.walls[0].hp=0;assert.equal(g.install(0).ok,false);});
test('Attack during installation preserves purchased kit',()=>{const g=readyGame();g.inventory=2;g.player={...g.walls[0]};g.install(0);advance(g,.5);g.walls[0].lastHit=g.time;advance(g,.1);assert.equal(g.job,null);assert.equal(g.inventory,2);assert.equal(g.walls[0].level,1);});
test('Moving cancels work without consuming kit',()=>{const g=readyGame();g.inventory=2;g.player={...g.walls[0]};g.install(0);g.step(.1,{x:1});assert.equal(g.job,null);assert.equal(g.inventory,2);});
test('Repair is paid, bounded by max HP, and allowed under attack',()=>{const g=readyGame();g.player={...g.walls[0]};g.walls[0].hp=100;g.walls[0].lastHit=0;assert.equal(g.repair(0).ok,true);advance(g,4.2);assert.equal(g.walls[0].hp,180);assert.ok(Math.abs(g.stats.spent-12)<.001);});
test('Destroyed walls require replacement and cannot be repaired',()=>{const g=readyGame();g.walls[0].hp=0;g.player={...g.walls[0]};assert.equal(g.repair(0).ok,false);});
test('Cannons kill titans and grant rewards',()=>{const g=readyGame();g.spawn();g.monsters[0].x=0;g.monsters[0].y=60;g.monsters[0].hp=1;advance(g,2);assert.equal(g.stats.kills,1);assert.ok(g.money>=230);});
test('A titan that breached does not walk back to a restored wall',()=>{const g=readyGame();g.spawn();const m=g.monsters[0],w=g.walls[m.target];w.hp=0;m.x=w.x;m.y=w.y+15;advance(g,.1);assert.equal(m.breached,true);w.hp=180;const y=m.y;advance(g,.5);assert.ok(m.y>y);});
test('City destruction ends simulation',()=>{const g=readyGame();g.core=1;g.spawn();g.monsters[0].breached=true;g.monsters[0].x=0;g.monsters[0].y=g.corePosition.y-20;advance(g,.1);assert.equal(g.state,'lost');const t=g.time;advance(g,10);assert.equal(g.time,t);});
test('Wave twelve is final; clearing it produces a win',()=>{const g=readyGame();g.wave=MAX_WAVES;g.nextWave=0;g.monsters=[];g.step(.1);assert.equal(g.wave,MAX_WAVES);assert.equal(g.state,'won');});
test('Full refund preserves balance and clears kit',()=>{const g=readyGame();g.player={...g.shop};g.money=400;g.buy(2);assert.equal(g.refund().ok,true);assert.equal(g.money,400);assert.equal(g.inventory,null);});
test('Fixed-step simulation is reproducible',()=>{const a=readyGame(),b=readyGame();advance(a,400);advance(b,400);assert.deepEqual(a.export(),b.export());});
test('Six walls form a horizontal line ahead of the city',()=>{const g=readyGame();assert.equal(new Set(g.walls.map(w=>w.y)).size,1);assert.equal(new Set(g.walls.map(w=>w.x)).size,6);assert.ok(g.corePosition.y>g.walls[0].y);});
test('Direct upgrade charges the displayed price and changes only selected wall',()=>{const g=readyGame();g.money=400;assert.equal(upgradeNearby(g,3).ok,true);assert.equal(g.money,0);assert.equal(g.walls[3].level,1);advance(g,1.9);assert.equal(g.walls[3].level,1);advance(g,.1);assert.equal(g.walls[3].level,2);assert.equal(g.walls[3].hp,600);assert.equal(g.walls.filter(w=>w.level===1).length,5);});
test('Insufficient resources cannot upgrade or spend funds',()=>{const g=readyGame();assert.equal(upgradeNearby(g,3).ok,false);assert.equal(g.money,150);assert.equal(g.walls[3].level,1);});
test('An attacked wall blocks direct upgrade',()=>{const g=readyGame();g.money=500;g.spawn();const m=g.monsters[0],w=g.walls[m.target];m.x=w.x;m.y=w.y-40;assert.equal(upgradeNearby(g,w.id).ok,false);assert.equal(g.money,500);});
test('Forecast is stable, targets spawn from above, and routes commit to one wall',()=>{const g=readyGame({seed:128});const plan=g.forecast();assert.deepEqual(g.forecast(),plan);g.spawn();const m=g.monsters[0];assert.equal(m.target,plan[0]);assert.ok(m.y<g.walls[m.target].y);advance(g,5);assert.equal(m.target,plan[0]);});
test('Seeds produce different attack plans without duplicate targets within a wave',()=>{const plans=Array.from({length:12},(_,i)=>readyGame({seed:i+1}).plans);assert.ok(new Set(plans.map(p=>JSON.stringify(p))).size>1);for(const p of plans)for(const wave of p)assert.equal(new Set(wave).size,wave.length);});
test('Destroyed wall can be restored at its current level',()=>{const g=readyGame();g.walls[2].hp=0;g.money=20;assert.equal(upgradeNearby(g,2).ok,true);assert.equal(g.money,0);assert.equal(g.walls[2].hp,0);advance(g,2);assert.equal(g.walls[2].hp,180);});
test('A distant titan uses its selected gap before entering the city',()=>{const g=readyGame();g.spawn();const m=g.monsters[0];g.walls[m.target].hp=0;advance(g,1);assert.equal(!!m.breached,false);});
test('Player can cross walls and explore the field but cannot leave its bounds',()=>{const g=readyGame({firstWave:1000});g.walls.forEach(w=>w.hp=0);for(let i=0;i<600;i++)g.step(1/60,{x:0,y:-1});assert.equal(g.player.y,FIELD_BOUNDS.top);for(let i=0;i<600;i++)g.step(1/60,{x:1,y:1});assert.equal(g.player.x,290);assert.equal(g.player.y,FIELD_BOUNDS.bottom);});
test('Waves do not overlap while even one titan is still alive',()=>{const g=readyGame();g.spawn();const m=g.monsters[0];m.hp=1e9;m.damage=0;m.speed=0;advance(g,40);assert.equal(g.wave,1);assert.equal(g.phase,'battle');assert.equal(g.nextWave,null);});
test('Clearing a level starts exactly 12 seconds of preparation and keeps upgrades',()=>{const g=readyGame();g.money=500;upgradeNearby(g,0);advance(g,2);g.spawn();g.monsters.forEach(m=>m.hp=0);g.step(1/60);assert.equal(g.phase,'prep');assert.ok(Math.abs(g.nextWave-g.time-12)<1e-8);assert.equal(g.walls[0].level,2);advance(g,11.9);assert.equal(g.wave,1);advance(g,.1);assert.equal(g.wave,2);assert.equal(g.phase,'battle');});
test('Preparation starts only after the last titan of a multi-titan level dies',()=>{const g=readyGame();g.wave=2;g.spawn();assert.equal(g.monsters.length,2);g.monsters[0].hp=0;g.monsters[1].hp=1e9;g.monsters[1].speed=0;g.step(1/60);assert.equal(g.phase,'battle');assert.equal(g.nextWave,null);g.monsters[0].hp=0;g.step(1/60);assert.equal(g.phase,'prep');});
test('Titans move slowly and approach their selected wall',()=>{const g=readyGame();g.spawn();const m=g.monsters[0],p={x:m.x,y:m.y};advance(g,1);assert.ok(Math.abs(dist(p,m)-8.25)<.01);assert.ok(m.y>p.y);});
test('Income is paid every two seconds with five dollars per live wooden wall',()=>{const g=readyGame();advance(g,1.9);assert.equal(g.money,150);assert.equal(g.incomePulses.length,0);advance(g,.1);assert.ok(Math.abs(g.money-180)<1e-7);assert.equal(g.incomePulses.length,1);assert.equal(g.incomePulses[0].sections.length,6);for(const s of g.incomePulses[0].sections)assert.ok(Math.abs(s.amount-5)<1e-7);});
test('Destroyed sections stop generating income and are absent from the next full payout',()=>{const g=readyGame();g.walls[2].hp=0;advance(g,2);assert.ok(Math.abs(g.money-175)<1e-7);assert.equal(g.incomePulses[0].sections.some(s=>s.id===2),false);});
test('Mid-second upgrade prorates income without losing or duplicating dollars',()=>{const g=readyGame();g.money=400;advance(g,.5);assert.equal(upgradeNearby(g,0).ok,true);advance(g,.5);assert.equal(g.income(),30);assert.equal(g.walls[0].level,1);advance(g,3);assert.ok(Math.abs(g.money-63.75)<1e-7);assert.ok(Math.abs(g.incomePulses.at(-1).sections[0].amount-8.75)<1e-7);assert.equal(g.income(),35);});

test('Fresh game has six empty sites, 20 dollars, no income and no titan timer',()=>{const g=new Game();assert.equal(g.money,20);assert.equal(g.income(),0);assert.equal(g.builtCount(),0);assert.ok(g.walls.every(w=>!w.built&&w.hp===0));advance(g,60);assert.equal(g.money,20);assert.equal(g.wave,0);assert.equal(g.nextWave,null);});
test('Construction requires proximity and costs exactly 20 dollars',()=>{const g=new Game();assert.equal(g.construct(0).ok,false);g.player={x:g.walls[0].x,y:175};assert.equal(g.construct(0).ok,true);assert.equal(g.money,0);assert.equal(g.walls[0].hp,180);assert.equal(g.builtCount(),1);assert.equal(g.construct(0).ok,false);assert.equal(g.stats.spent,20);});
test('A first wall earns enough for the next wall in eight seconds',()=>{const g=new Game();g.player={x:g.walls[0].x,y:175};g.construct(0);advance(g,7);assert.ok(Math.abs(g.money-15)<1e-7);g.player={x:g.walls[1].x,y:175};assert.equal(g.construct(1).ok,false);advance(g,1);assert.equal(g.construct(1).ok,true);assert.equal(g.income(),10);assert.equal(g.stats.builds,2);});
test('No upgrade or shop purchase can bypass six initial constructions',()=>{const g=new Game();g.money=1e4;g.player={x:g.walls[0].x,y:175};g.construct(0);assert.equal(upgradeNearby(g,0).ok,false);g.player={...g.shop};assert.equal(g.buy(2).ok,false);g.inventory=2;g.player={x:g.walls[1].x,y:175};assert.equal(g.install(1).ok,false);assert.equal(g.walls[1].built,false);});
test('Sixth construction unlocks upgrades and starts exactly ten seconds of preparation',()=>{const g=new Game();g.money=2000;advance(g,45);for(let i=0;i<6;i++){g.player={x:g.walls[i].x,y:175};assert.equal(g.construct(i).ok,true);}assert.equal(g.income(),30);assert.equal(g.phase,'prep');assert.ok(Math.abs(g.nextWave-g.time-10)<1e-7);assert.equal(upgradeNearby(g,0).ok,true);advance(g,9.9);assert.equal(g.wave,0);advance(g,.1);assert.equal(g.wave,1);});
test('Rebuilding a destroyed wall does not re-lock construction progression',()=>{const g=readyGame();g.walls[0].hp=0;assert.equal(g.builtCount(),6);assert.equal(g.construct(0).ok,false);assert.equal(upgradeNearby(g,0).ok,true);assert.equal(g.builtCount(),6);});
test('All six sites are reachable from inside the city with normal movement',()=>{const g=new Game();g.money=200;for(const w of g.walls){const p={x:w.x,y:175};for(let i=0;i<300&&dist(g.player,p)>3;i++)g.step(1/60,{x:p.x-g.player.x,y:p.y-g.player.y});assert.ok(g.player.y>=168);assert.equal(g.construct(w.id).ok,true);}assert.equal(g.builtCount(),6);});

test('First payout is five dollars two full seconds after first construction',()=>{const g=new Game();advance(g,.6);g.player={x:g.walls[0].x,y:175};g.construct(0);advance(g,1.9);assert.equal(g.money,0);advance(g,.1);assert.ok(Math.abs(g.money-5)<1e-7);});

test('Every direct upgrade level waits two seconds and retains old stats until completion',()=>{const g=readyGame({firstWave:1000,startingMoney:1e5});for(let level=2;level<=5;level++){assert.equal(upgradeNearby(g,0).ok,true);assert.equal(g.job.duration,2);advance(g,1.9);assert.equal(g.walls[0].level,level-1);assert.equal(g.income(),25+LEVELS[level-1].income);advance(g,.1);assert.equal(g.walls[0].level,level);assert.equal(g.walls[0].hp,LEVELS[level].hp);assert.equal(g.job,null);}assert.equal(g.stats.installs,4);});
test('Repeated upgrade clicks cannot restart timers or charge twice',()=>{const g=readyGame({startingMoney:2000});upgradeNearby(g,0);advance(g,.5);const cost=g.stats.spent;assert.equal(upgradeNearby(g,0).ok,false);assert.equal(upgradeNearby(g,1).ok,false);assert.equal(g.job.id,0);assert.ok(Math.abs(g.job.t-.5)<1e-7);assert.equal(g.stats.spent,cost);});
test('Moving cancels a paid upgrade and refunds its full price',()=>{const g=readyGame({startingMoney:400});upgradeNearby(g,0);advance(g,.5);g.step(.1,{x:1});assert.equal(g.job,null);assert.equal(g.money,400);assert.equal(g.stats.spent,0);assert.equal(g.walls[0].level,1);assert.equal(g.stats.installs,0);});
test('Attack interrupts direct upgrade with full refund and no change of level',()=>{const g=readyGame({startingMoney:400});upgradeNearby(g,0);advance(g,.5);g.walls[0].lastHit=g.time;g.step(.1);assert.equal(g.job,null);assert.equal(g.money,400);assert.equal(g.walls[0].level,1);assert.equal(g.stats.installs,0);});
test('Cancelling through the shop cannot refund twice or remove an unrelated kit',()=>{const g=readyGame({startingMoney:400});g.inventory=3;upgradeNearby(g,0);g.cancelJob();g.cancelJob();assert.equal(g.money,400);assert.equal(g.stats.spent,0);assert.equal(g.inventory,3);});
test('Completing a paid upgrade preserves a previously purchased kit',()=>{const g=readyGame({startingMoney:400});g.inventory=3;upgradeNearby(g,0);advance(g,2);assert.equal(g.walls[0].level,2);assert.equal(g.inventory,3);assert.equal(g.stats.installs,1);assert.equal(g.stats.spent,400);});

test('Income upgrade requires an unlocked nearby shop and 5000 dollars',()=>{
 const g=new Game({startingMoney:10000});g.player={...g.shop};assert.equal(g.upgradeIncome().ok,false);assert.equal(g.money,10000);
 const h=readyGame({startingMoney:5000});assert.equal(h.upgradeIncome().ok,false);h.player={...h.shop};h.money=4999;assert.equal(h.upgradeIncome().ok,false);assert.equal(h.money,4999);assert.equal(h.incomeInterval(),2);
 h.money=5000;assert.equal(h.upgradeIncome().ok,true);assert.equal(h.money,0);assert.equal(h.incomeInterval(),1);assert.equal(h.incomePerSecond(),30);
});
test('Income upgrade charges only once and does not consume an inventory kit',()=>{
 const g=readyGame({startingMoney:10000});g.player={...g.shop};g.inventory=3;assert.equal(g.upgradeIncome().ok,true);assert.equal(g.money,5000);assert.equal(g.upgradeIncome().ok,false);assert.equal(g.money,5000);assert.equal(g.stats.spent,5000);assert.equal(g.inventory,3);
});
test('Upgraded economy pays once a second and halves no payout amounts',()=>{
 const g=readyGame({startingMoney:5000});g.player={...g.shop};g.upgradeIncome();advance(g,.9);assert.equal(g.money,0);advance(g,.1);assert.ok(Math.abs(g.money-30)<1e-7);advance(g,1);assert.ok(Math.abs(g.money-60)<1e-7);assert.equal(g.incomePulses.length,2);
});
test('Buying income upgrade preserves partially earned dollars and cycle progress',()=>{
 const g=readyGame({startingMoney:5000});g.player={...g.shop};advance(g,1);assert.equal(g.money,5000);assert.equal(g.upgradeIncome().ok,true);assert.ok(Math.abs(g.incomeClock-.5)<1e-7);assert.equal(g.money,0);
 advance(g,.4);assert.equal(g.money,0);advance(g,.1);assert.ok(Math.abs(g.money-30)<1e-7);advance(g,1);assert.ok(Math.abs(g.money-60)<1e-7);
});
test('Income upgrade applies to all materials, excludes rubble and survives wall rebuilding',()=>{
 const g=readyGame({startingMoney:20000,firstWave:1000});g.player={...g.shop};g.walls[0].hp=0;g.walls[1].level=5;g.walls[1].hp=LEVELS[5].hp;assert.equal(g.incomePerSecond(),40);g.upgradeIncome();advance(g,1);assert.ok(Math.abs(g.incomePulses.at(-1).amount-80)<1e-7);assert.equal(g.incomePulses.at(-1).sections.some(s=>s.id===0),false);
 assert.equal(upgradeNearby(g,0).ok,true);advance(g,2);assert.equal(g.incomeInterval(),1);assert.equal(g.incomePerSecond(),85);
});
test('Income upgrade is recorded and resets for a new run; finished games cannot buy',()=>{
 const g=readyGame({startingMoney:5000});g.player={...g.shop};g.upgradeIncome();assert.equal(g.export().incomeUpgraded,true);assert.equal(g.export().incomeInterval,1);assert.equal(g.log.at(-1).type,'income-upgrade');
 const h=readyGame({startingMoney:5000});assert.equal(h.incomeInterval(),2);assert.equal(h.incomeUpgraded,false);h.player={...h.shop};h.state='lost';assert.equal(h.upgradeIncome().ok,false);assert.equal(h.money,5000);
});

test('Every titan wave gains another 20 percent HP without changing attack or rewards',()=>{
 const g=readyGame();
 for(let wave=1;wave<=MAX_WAVES;wave++){g.monsters=[];g.spawn();for(const m of g.monsters){assert.equal(m.hp,Math.round(Math.round(Math.round(900*1.25**(wave-1))*1.5)*1.2));assert.equal(m.maxHp,m.hp);assert.equal(m.damage,Math.round(30*1.2**(wave-1)));}}
});
test('Cannon upgrade requires six walls, proximity, funds and an active run',()=>{
 const fresh=new Game({startingMoney:5000});fresh.player={...fresh.shop};assert.equal(fresh.upgradeDamage().ok,false);
 const g=readyGame({startingMoney:5000});assert.equal(g.upgradeDamage().ok,false);g.player={...g.shop};g.money=4999;assert.equal(g.upgradeDamage().ok,false);assert.equal(g.money,4999);g.money=5000;g.state='lost';assert.equal(g.upgradeDamage().ok,false);assert.equal(g.money,5000);
});
test('Cannon upgrade charges once, preserves inventory and stays independent of income',()=>{
 const g=readyGame({startingMoney:15000});g.player={...g.shop};g.inventory=4;assert.equal(g.upgradeDamage().ok,true);assert.equal(g.money,10000);assert.equal(g.upgradeDamage().ok,false);assert.equal(g.money,10000);assert.equal(g.inventory,4);assert.equal(g.incomeInterval(),2);assert.equal(g.upgradeIncome().ok,true);assert.equal(g.money,5000);assert.equal(g.damageUpgraded,true);assert.equal(g.export().damageUpgraded,true);assert.equal(new Game().damageUpgraded,false);
});
test('Every cannon material deals exactly 20 percent more projectile damage',()=>{
 for(let level=1;level<=5;level++){
  const g=readyGame({startingMoney:5000,firstWave:1000});g.player={...g.shop};g.upgradeDamage();
  g.walls.forEach(w=>w.hp=0);const w=g.walls[0];w.hp=LEVELS[level].hp;w.level=level;
  g.spawn();const m=g.monsters[0];m.x=w.x;m.y=w.y-80;m.speed=0;m.damage=0;const before=m.hp;
  g.step(1/60);assert.equal(g.bullets.length,1);assert.ok(Math.abs(g.bullets[0].damage-LEVELS[level].damage*1.2)<1e-9);
  advance(g,.3);assert.ok(Math.abs(before-m.hp-LEVELS[level].damage*1.2)<1e-9);
 }
});
test('Damage bonus survives wall replacement and applies to newly fired shells only',()=>{
 const g=readyGame({startingMoney:6000,firstWave:1000});g.spawn();const m=g.monsters[0];m.x=-250;m.y=0;m.speed=0;
 g.step(1/60);const existing=g.bullets.map(b=>b.damage);g.player={...g.shop};g.upgradeDamage();assert.deepEqual(g.bullets.map(b=>b.damage),existing);
 g.monsters=[];g.walls[0].hp=0;assert.equal(upgradeNearby(g,0).ok,true);advance(g,2);assert.equal(g.walls[0].hp,180);assert.ok(Math.abs(g.cannonDamage(1)-7.2)<1e-9);assert.equal(upgradeNearby(g,0).ok,true);advance(g,2);assert.ok(Math.abs(g.cannonDamage(2)-22.8)<1e-9);
});
test('Twelve waves spawn the requested counts and distinct target walls',()=>{
 const counts=[1,1,2,2,2,3,3,3,2,4,4,5];assert.equal(MAX_WAVES,12);assert.deepEqual(WAVE_COUNTS,counts);
 for(const seed of [91,128,401,732]){const g=readyGame({seed});for(const count of counts){g.monsters=[];const forecast=g.forecast();g.spawn();assert.equal(g.monsters.length,count);assert.equal(new Set(g.monsters.map(m=>m.target)).size,count);assert.deepEqual(g.monsters.map(m=>m.target),forecast);}assert.deepEqual(g.forecast(),[]);g.monsters=[];g.spawn();assert.equal(g.wave,12);assert.equal(g.monsters.length,0);}
});
test('Clearing waves one through eleven preserves progress and starts the next after twelve seconds',()=>{
 const g=readyGame({startingMoney:10000});g.walls[0].level=4;g.walls[0].hp=1234;g.core=999;g.incomeUpgraded=true;g.damageUpgraded=true;g.inventory=3;g.spawn();
 for(let wave=1;wave<MAX_WAVES;wave++){g.monsters.forEach(m=>m.hp=0);g.step(1/60);assert.equal(g.state,'playing');assert.equal(g.phase,'prep');assert.equal(g.walls[0].hp,1234);assert.equal(g.core,999);assert.equal(g.inventory,3);assert(g.incomeUpgraded&&g.damageUpgraded);advance(g,11.9);assert.equal(g.wave,wave);advance(g,.1);assert.equal(g.wave,wave+1);assert.equal(g.monsters.length,WAVE_COUNTS[wave]);}
});
test('Final victory waits for the fifth titan, gives all rewards, then stops',()=>{
 const g=readyGame({startingMoney:0});g.wave=11;g.spawn();assert.equal(g.monsters.length,5);g.monsters.forEach((m,i)=>{m.hp=i===4?1e9:0;m.speed=0;});g.step(1/60);assert.equal(g.state,'playing');assert.equal(g.monsters.length,1);assert.equal(g.stats.kills,4);g.monsters[0].hp=0;g.step(1/60);assert.equal(g.state,'won');assert.equal(g.stats.kills,5);assert.equal(g.money,5*2910);const t=g.time;advance(g,20);g.spawn();assert.equal(g.time,t);assert.equal(g.wave,12);assert.equal(g.monsters.length,0);
});
test('Late wall prices, HP, income and boosted damage match the twelve-wave balance',()=>{
 const g=readyGame({startingMoney:20000,firstWave:1000});g.walls[0].level=3;g.walls[0].hp=1250;
 assert.equal(upgradeNearby(g,0).ok,true);assert.equal(g.money,17000);advance(g,2);assert.equal(g.walls[0].hp,2800);assert.equal(g.cannonDamage(4),100);assert.equal(LEVELS[4].income,32);
 const before=g.money;assert.equal(upgradeNearby(g,0).ok,true);assert.equal(g.money,before-8500);advance(g,2);assert.equal(g.walls[0].hp,6200);assert.equal(g.cannonDamage(5),240);assert.equal(LEVELS[5].income,60);g.player={...g.shop};assert.equal(g.upgradeDamage().ok,true);assert.equal(g.cannonDamage(5),288);assert.equal(upgradeNearby(g,0).ok,false);
});
test('Large waves start in separate lanes above their targets and cannot overlap waves',()=>{
 for(let wave=6;wave<=12;wave++){if(WAVE_COUNTS[wave-1]<3)continue;const g=readyGame();g.wave=wave-1;g.spawn();const xs=g.monsters.map(m=>m.x).sort((a,b)=>a-b);for(let i=1;i<xs.length;i++)assert(xs[i]-xs[i-1]>75);for(const m of g.monsters){assert(Math.abs(m.x-(-195+m.target*90))<=8);assert(m.y>=-230&&m.y<=-205);}g.spawn();assert.equal(g.wave,wave);assert.equal(g.monsters.length,WAVE_COUNTS[wave-1]);}
});
test('Chests unlock after construction, use a separate random stream and respect the cap',()=>{
 const fresh=new Game();advance(fresh,120);assert.equal(fresh.chests.length,0);assert.equal(fresh.nextChest,null);assert.equal(fresh.spawnChest(),false);
 const a=readyGame({firstWave:1000}),b=readyGame({firstWave:1000});advance(a,14.9);assert.equal(a.chests.length,0);advance(a,7.6);assert.equal(a.chests.length,1);assert.equal(a.randomState,b.randomState);assert.deepEqual(a.plans,b.plans);
 a.spawnChest();a.spawnChest();assert.equal(a.chests.length,3);assert.equal(a.spawnChest(),false);for(const c of a.chests){assert(c.x>=FIELD_BOUNDS.left&&c.x<=FIELD_BOUNDS.right);assert(c.y>=FIELD_BOUNDS.top&&c.y<=FIELD_BOUNDS.bottom);assert(a.walls.every(w=>dist(w,c)>=55));}
});
test('Walking to a chest credits the advertised money once and leaves inventory intact',()=>{
 const g=readyGame({firstWave:1000,startingMoney:0});g.walls.forEach(w=>w.hp=0);g.inventory=3;g.spawnChest();const c=g.chests[0],amount=c.amount;
 for(let i=0;i<600&&g.chests.some(x=>x.id===c.id);i++)g.step(1/60,{x:c.x-g.player.x,y:c.y-g.player.y});
 assert.equal(g.money,amount);assert.equal(g.stats.chestEarned,amount);assert.equal(g.stats.chests,1);assert.equal(g.inventory,3);assert.equal(g.chestPulses.length,1);g.step(1/60);assert.equal(g.money,amount);
});
test('Chest expiry grants no money; terminal games freeze loot and new runs reset it',()=>{
 const g=readyGame({firstWave:1000});g.walls.forEach(w=>w.hp=0);g.spawnChest();const id=g.chests[0].id,money=g.money;advance(g,9.9);assert(g.chests.some(c=>c.id===id));advance(g,.1);assert(!g.chests.some(c=>c.id===id));assert.equal(g.money,money);
 g.state='lost';const before=JSON.stringify(g.chests);advance(g,100);assert.equal(JSON.stringify(g.chests),before);assert.equal(g.spawnChest(),false);const h=new Game();assert.equal(h.stats.chests,0);assert.equal(h.chests.length,0);
});
test('Treasure rewards increase with the level and stay fixed after spawn',()=>{
 let last=0;for(let level=1;level<=12;level++){const n=chestReward(level);assert(n>=last);assert.equal(n,Math.round(40*1.45**(level-1)/20)*20*.8);last=n;}
 assert.equal(chestReward(1),32);assert.equal(chestReward(12),1904);
 const g=readyGame();g.wave=8;g.phase='prep';g.spawnChest();assert.equal(g.chests[0].level,9);assert.equal(g.chests[0].amount,chestReward(9));g.wave=12;assert.equal(g.chests[0].amount,chestReward(9));
});
test('Treasure frequency is 20 percent lower, with deterministic placement',()=>{
 for(const level of [1,12]){const a=readyGame({seed:321}),b=readyGame({seed:321});for(const g of [a,b]){g.wave=level;g.phase='battle';g.nextChest=0;g.updateChests();const min=(level===1?26:16)/.8;assert(g.nextChest>=min&&g.nextChest<=min+8/.8);}assert.deepEqual(a.chests,b.chests);assert.equal(a.nextChest,b.nextChest);}
});
test('Treasure stays on open green lawns across 100 seeds, clear of paths and buildings',()=>{
 for(let seed=0;seed<100;seed++){const g=readyGame({seed});for(let n=0;n<30;n++){g.chests=[];assert(g.spawnChest());const p=fieldPoint(g.chests[0]);assert(p.x>=210&&p.x<=1710);assert((p.y>=420&&p.y<=550)||(p.y>=879&&p.y<=915&&(p.x<=475||p.x>=1240)));assert(p.y-75>330);}}
});
test('Titan reaches the wall, stays behind it and strikes on its real cooldown',()=>{
 const g=readyGame({firstWave:1000});g.spawn();const m=g.monsters[0],w=g.walls[m.target];m.x=w.x;m.y=w.y-40;m.hp=m.maxHp=1e9;w.level=5;w.hp=6200;
 advance(g,2.2);assert.equal(m.phase,'wall');assert(m.y<w.y);assert(dist(m,w)<=24);assert.equal(w.hp,6170);const position={x:m.x,y:m.y};advance(g,1);assert.equal(w.hp,6170);assert.deepEqual({x:m.x,y:m.y},position);advance(g,.7);assert.equal(w.hp,6140);
});
test('Direct upgrades and kits require proximity and do not charge from afar',()=>{
 for(const action of ['upgrade','install']){const g=readyGame({startingMoney:5000});g.inventory=2;const money=g.money;assert.equal(g[action](0).ok,false);assert.equal(g[action](0).text,'Игрок должен быть рядом');assert.equal(g.money,money);assert.equal(g.inventory,2);assert.equal(g.job,null);g.player={x:g.walls[0].x,y:g.walls[0].y+85};assert(g[action](0).ok);}
});
test('Every damaged material requires full repair before upgrade or kit installation',()=>{
 for(let level=1;level<=5;level++)for(const action of ['upgrade','install']){const g=readyGame({firstWave:1000,startingMoney:100000});const w=g.walls[0];w.level=level;w.hp=LEVELS[level].hp-1;g.player={x:w.x,y:w.y+55};g.inventory=Math.min(5,level+1);const money=g.money;assert.equal(g[action](0).ok,false);assert.equal(g.money,money);assert.equal(g.job,null);assert(g.repair(0).ok);advance(g,.1);assert.equal(w.hp,LEVELS[level].hp);assert.equal(g.job,null);if(level<5||action==='install')assert(g[action](0).ok);}
});
test('Damaging a wall during replacement cancels, refunds direct cost and preserves kit',()=>{
 for(const action of ['upgrade','install']){const g=readyGame({startingMoney:5000});g.player={x:g.walls[0].x,y:175};g.inventory=2;assert(g[action](0).ok);g.walls[0].hp--;g.step(1/60);assert.equal(g.job,null);assert.equal(g.money,5000);assert.equal(g.inventory,2);assert.equal(g.walls[0].level,1);}
});
test('Leaving replacement range prevents completion even without movement input',()=>{
 for(const action of ['upgrade','install']){const g=readyGame({startingMoney:5000});g.player={x:g.walls[0].x,y:175};g.inventory=2;assert(g[action](0).ok);g.player={...g.shop};advance(g,1);assert.equal(g.job,null);assert.equal(g.money,5000);assert.equal(g.inventory,2);assert.equal(g.walls[0].level,1);}
});
test('Rubble must be rebuilt at its current tier before a better kit can be installed',()=>{
 const g=readyGame({firstWave:1000,startingMoney:5000});const w=g.walls[0];g.player={x:w.x,y:175};w.level=2;w.hp=0;g.inventory=3;assert.equal(g.install(0).ok,false);assert(g.upgrade(0).ok);advance(g,2);assert.equal(w.level,2);assert.equal(w.hp,600);assert.equal(g.inventory,3);assert(g.install(0).ok);advance(g,2);assert.equal(w.level,3);assert.equal(g.inventory,null);
 const h=readyGame({firstWave:1000});h.player={x:h.walls[0].x,y:175};h.walls[0].hp=0;h.inventory=1;assert(h.install(0).ok);advance(h,2);assert.equal(h.walls[0].hp,180);
});
test('First chest timing is also 20 percent less frequent',()=>{
 for(let seed=0;seed<100;seed++){const g=readyGame({seed});assert(g.nextChest>=15&&g.nextChest<=22.5);}
});
console.log(JSON.stringify(tests,null,2));if(tests.some(t=>!t.pass))process.exitCode=1;
