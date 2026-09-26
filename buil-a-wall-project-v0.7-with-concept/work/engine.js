(function(root){
'use strict';
const TAU=Math.PI*2;
const WAVE_COUNTS=[1,1,2,2,2,3,3,3,2,4,4,5];
const MAX_WAVES=WAVE_COUNTS.length;
const FIELD_BOUNDS={left:-290,right:290,top:-170,bottom:330};
// Shared projection keeps loot placement and canvas collision targets on the same ground.
const FIELD_LAYOUT={horizon:330,wallY:740,bottom:1040};
const fieldPoint=p=>({x:60+(p.x+315)*1800/630,y:p.y<=120?120+(p.y+335)*620/455:740+(p.y-120)*300/215});
const fieldFromScreen=p=>({x:(p.x-60)*630/1800-315,y:p.y<=740?(p.y-120)*455/620-335:(p.y-740)*215/300+120});
const CHEST_LIFETIME=10, CHEST_FREQUENCY=.8;
const chestReward=level=>Math.round(40*Math.pow(1.45,Math.max(0,Math.min(12,level)-1))/20)*16;
const INCOME_UPGRADE_PRICE=5000;
const DAMAGE_UPGRADE_PRICE=5000;
const LEVELS=[null,
 {name:'Дерево',hp:180,damage:6,income:5,price:20,color:'#bda078'},
 {name:'Камень',hp:600,damage:19,income:10,price:400,color:'#b5c6bc'},
 {name:'Сталь',hp:1250,damage:43,income:18,price:1100,color:'#9dcbd2'},
 {name:'Бастион',hp:2800,damage:100,income:32,price:3000,color:'#b9b3e5'},
 {name:'Цитадель',hp:6200,damage:240,income:60,price:8500,color:'#efc970'}
];
const NAMES=['Стена 1','Стена 2','Стена 3','Стена 4','Стена 5','Стена 6'];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angle=i=>-Math.PI/2+i*TAU/6;
const radial=(i,r)=>({x:Math.cos(angle(i))*r,y:Math.sin(angle(i))*r});
class Game {
 constructor(options={}){
  this.options={firstWave:10,interval:12,seed:91,prebuilt:false,startingMoney:20,...options};this.time=0;this.money=this.options.startingMoney;this.core=1200;this.wave=0;this.phase=this.options.prebuilt?'prep':'build';
  this.incomeClock=0;this.incomeAccrual=Array(6).fill(0);this.incomePulses=[];this.incomeUpgraded=false;this.damageUpgraded=false;
  this.randomState=this.options.seed>>>0;this.plans=Array.from({length:MAX_WAVES},(_,wave)=>{const ids=[0,1,2,3,4,5];for(let i=5;i>0;i--){const j=Math.floor(this.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids.slice(0,WAVE_COUNTS[wave]);});
  this.corePosition={x:0,y:330};
  this.nextWave=this.options.prebuilt?this.options.firstWave:null;this.player={x:0,y:285};this.shop={x:-125,y:315};this.inventory=null;
  this.chestRandomState=(this.options.seed^0x9e3779b9)>>>0;this.chests=[];this.chestPulses=[];this.nextChestId=1;this.nextChest=this.options.prebuilt?(12+this.chestRandom()*6)/CHEST_FREQUENCY:null;
  this.walls=Array.from({length:6},(_,i)=>({x:(i-2.5)*100,y:120,id:i,built:this.options.prebuilt,level:1,hp:this.options.prebuilt?180:0,cooldown:0,lastHit:-999,flash:0}));
  this.monsters=[];this.bullets=[];this.effects=[];this.events=[];this.state='playing';this.job=null;
  this.stats={earned:0,spent:0,kills:0,breaks:0,repairs:0,installs:0,builds:0,coreLost:0,firstBreach:null,chests:0,chestEarned:0};this.log=[];
  this.nextId=1;this.invulnerable=0;this.notice('Подойдите к зелёной точке и купите первую стену за $20.');
 }
 notice(text){this.events.push({text,time:this.time});if(this.events.length>6)this.events.shift();}
 record(type,data={}){this.log.push({t:Math.round(this.time*10)/10,type,...data});}
 income(){return this.walls.reduce((a,w)=>a+(w.hp>0?LEVELS[w.level].income:0),0);}
 incomeInterval(){return this.incomeUpgraded?1:2;}
 incomePerSecond(){return this.income()/this.incomeInterval();}
 cannonDamage(level){return LEVELS[level].damage*(this.damageUpgraded?1.2:1);}
 upgradeDamage(){
  if(this.state!=='playing')return {ok:false,text:'Забег завершён.'};
  if(this.builtCount()<6)return {ok:false,text:'Сначала постройте все 6 стен.'};
  if(dist(this.player,this.shop)>65)return {ok:false,text:'Улучшение урона доступно в магазине.'};
  if(this.damageUpgraded)return {ok:false,text:'Урон пушек уже увеличен на 20%.'};
  if(!this.spend(DAMAGE_UPGRADE_PRICE))return {ok:false,text:'Не хватает долларов. Улучшение стоит $5 000.'};
  this.damageUpgraded=true;this.record('damage-upgrade',{cost:DAMAGE_UPGRADE_PRICE,multiplier:1.2});
  return {ok:true,text:'Урон всех пушек увеличен на 20% до конца забега!'};
 }
 upgradeIncome(){
  if(this.state!=='playing')return {ok:false,text:'Забег завершён.'};
  if(this.builtCount()<6)return {ok:false,text:'Сначала постройте все 6 стен.'};
  if(dist(this.player,this.shop)>65)return {ok:false,text:'Улучшение дохода доступно в магазине.'};
  if(this.incomeUpgraded)return {ok:false,text:'Выплаты раз в секунду уже открыты.'};
  if(!this.spend(INCOME_UPGRADE_PRICE))return {ok:false,text:'Не хватает долларов. Улучшение стоит $5 000.'};
  // Preserve the accrued dollars and fractional progress of the current payout.
  this.incomeClock/=2;this.incomeUpgraded=true;
  this.record('income-upgrade',{cost:INCOME_UPGRADE_PRICE,interval:1});
  return {ok:true,text:'Доход улучшен! Все стены приносят деньги раз в секунду.'};
 }
 builtCount(){return this.walls.filter(w=>w.built).length;}
 construct(id){
  const w=this.walls[id];
  if(this.state!=='playing'||!w)return {ok:false,text:'Строительство недоступно.'};
  if(w.built)return {ok:false,text:'Эта стена уже построена.'};
  if(dist(this.player,w)>75)return {ok:false,text:'Подойдите к зелёной точке.'};
  if(!this.spend(LEVELS[1].price))return {ok:false,text:'Не хватает долларов. Дождитесь дохода от стены.'};
  w.built=true;w.level=1;w.hp=LEVELS[1].hp;this.stats.builds++;this.record('construct',{sector:id});
  if(this.builtCount()===1){this.incomeClock=0;this.incomeAccrual.fill(0);}
  this.effects.push({x:w.x,y:w.y,t:1,type:'build'});
  if(this.builtCount()===6){this.phase='prep';this.nextWave=this.time+this.options.firstWave;this.nextChest=this.time+(12+this.chestRandom()*6)/CHEST_FREQUENCY;this.record('construction-complete',{firstWave:this.nextWave});}
  return {ok:true,text:this.builtCount()===6?'Шесть стен готовы! Улучшения открыты. Титан через 10 секунд.':`Стена построена! Доход +$5 каждые ${this.incomeInterval()} сек.`};
 }
 nearestWall(){return this.walls.reduce((a,w)=>dist(w,this.player)<dist(a,this.player)?w:a,this.walls[0]);}
 random(){this.randomState=(this.randomState*1664525+1013904223)>>>0;return this.randomState/4294967296;}
 chestRandom(){this.chestRandomState=(this.chestRandomState*1664525+1013904223)>>>0;return this.chestRandomState/4294967296;}
 spawnChest(){
  if(this.state!=='playing'||this.builtCount()<6||this.chests.length>=3)return false;
  const level=Math.max(1,Math.min(MAX_WAVES,this.wave+(this.phase==='prep'?1:0)));
  for(let attempt=0;attempt<24;attempt++){
   // Battlefield grass, or the side lawns behind the wall; never the roads/buildings.
   const outside=this.chestRandom()<.75;
   const side=this.chestRandom()<.5?-260:100;
   const p={x:outside?-260+this.chestRandom()*520:side+this.chestRandom()*150,y:outside?-110+this.chestRandom()*85:220+this.chestRandom()*25};
   if(!outside&&p.x>-170&&p.x<100)continue;
   if(dist(p,this.player)<60||this.chests.some(c=>dist(c,p)<75)||this.walls.some(w=>dist(w,p)<55)||this.monsters.some(m=>dist(m,p)<65))continue;
   const chest={...p,id:this.nextChestId++,amount:chestReward(level),level,expires:this.time+CHEST_LIFETIME};this.chests.push(chest);this.record('chest-spawn',{id:chest.id,level,amount:chest.amount});return true;
  }
  return false;
 }
 updateChests(){
  this.chests=this.chests.filter(c=>c.expires>this.time+1e-8);
  if(this.nextChest!==null&&this.time>=this.nextChest){this.spawnChest();const level=Math.max(1,this.wave);this.nextChest=this.time+(Math.max(16,27-level)+this.chestRandom()*8)/CHEST_FREQUENCY;}
  for(const c of this.chests){if(dist(c,this.player)>25)continue;
   this.money+=c.amount;this.stats.earned+=c.amount;this.stats.chestEarned+=c.amount;this.stats.chests++;c.collected=true;
   this.chestPulses.push({x:c.x,y:c.y,amount:c.amount});this.record('chest-collect',{id:c.id,amount:c.amount});this.notice('Золотой сундук: +$'+c.amount+'!');
  }
  this.chests=this.chests.filter(c=>!c.collected);this.chestPulses=this.chestPulses.slice(-8);
 }
 forecast(){return [...(this.plans[this.wave]||[])];}
 replacementIssue(id,level){
  const w=this.walls[id];if(!w)return 'Нет такой стены.';
  if(dist(this.player,w)>85)return 'Игрок должен быть рядом';
  if(w.hp>0&&w.hp<LEVELS[w.level].hp-1e-7)return 'Сначала полностью восстановите стену';
  if(w.hp<=0&&level>w.level)return 'Сначала восстановите разрушенную стену в текущем материале';
  return '';
 }
 upgrade(id){
  const w=this.walls[id];if(!w)return {ok:false,text:'Нет такой стены.'};
  if(this.state!=='playing')return {ok:false,text:'Забег завершён.'};
  if(this.builtCount()<6)return {ok:false,text:'Сначала постройте все 6 стен на зелёных точках.'};
  if(this.job)return {ok:false,text:'Дождитесь окончания работы.'};
  const issue=this.replacementIssue(id);if(issue)return {ok:false,text:issue};
  if(this.locked(id))return {ok:false,text:'Стену атакуют. Улучшение заблокировано.'};
  const level=w.hp<=0?w.level:w.level+1;
  if(!LEVELS[level])return {ok:false,text:'Максимальный уровень.'};
  if(!this.spend(LEVELS[level].price))return {ok:false,text:'Не хватает $'+Math.ceil(LEVELS[level].price-this.money)+'.'};
  this.job={type:'upgrade',id,t:0,duration:2,level,cost:LEVELS[level].price};
  return {ok:true,text:'Установка улучшения: 2 секунды.'};
 }
 cancelJob(){
  if(this.job?.type==='upgrade'){this.money+=this.job.cost;this.stats.spent-=this.job.cost;}
  this.job=null;
 }
 locked(id){const w=this.walls[id];return this.time-w.lastHit<2.5||this.monsters.some(m=>m.hp>0&&m.target===id&&dist(m,w)<58);}
 spend(n){if(this.money+1e-7<n)return false;this.money-=n;this.stats.spent+=n;return true;}
 buy(level){
  if(this.state!=='playing')return {ok:false,text:'Забег завершён.'};
  if(this.builtCount()<6)return {ok:false,text:'Магазин улучшений откроется после постройки 6 стен.'};
  if(dist(this.player,this.shop)>65)return {ok:false,text:'Подойдите к торговцу: нажмите «К магазину».'};
  if(this.inventory)return {ok:false,text:'Сначала установите или верните комплект.'};
  if(!LEVELS[level])return {ok:false,text:'Нет такого уровня.'};
  if(!this.spend(LEVELS[level].price))return {ok:false,text:'Недостаточно долларов.'};
  this.inventory=level;this.record('buy',{level});this.notice('Куплен комплект: '+LEVELS[level].name+'. Подойдите к секции и нажмите F.');
  return {ok:true,text:'Комплект в рюкзаке.'};
 }
 refund(){
  if(this.state!=='playing'||dist(this.player,this.shop)>65||!this.inventory)return {ok:false,text:'Возврат доступен у торговца.'};
  const cost=LEVELS[this.inventory].price;this.money+=cost;this.stats.spent-=cost;this.inventory=null;
  if(this.job?.type==='install')this.job=null;return {ok:true,text:'Комплект возвращён за полную стоимость.'};
 }
 install(id){
  const w=this.walls[id];
  if(this.state!=='playing')return {ok:false,text:'Забег завершён.'};
  if(this.builtCount()<6)return {ok:false,text:'Сначала постройте все 6 стен.'};
  if(this.job)return {ok:false,text:'Уже выполняется работа.'};
  if(!this.inventory)return {ok:false,text:'Купите комплект стены у торговца.'};
  const issue=this.replacementIssue(id,this.inventory);if(issue)return {ok:false,text:issue};
  if(this.inventory<w.level)return {ok:false,text:'Нельзя понизить уровень секции.'};
  if(this.locked(id))return {ok:false,text:'Секцию атакуют. Замену можно начать после отхода титана.'};
  this.job={type:'install',id,t:0,duration:2,level:this.inventory};return {ok:true,text:'Установка: 2 секунды. Не отходите.'};
 }
 repair(id){
  const w=this.walls[id];
  if(this.state!=='playing')return {ok:false,text:'Забег завершён.'};
  if(this.job)return {ok:false,text:'Уже выполняется работа.'};
  if(dist(this.player,w)>85)return {ok:false,text:'Подойдите ближе к выбранной секции.'};
  if(w.hp<=0)return {ok:false,text:'Секция разрушена. Нужен новый комплект.'};
  if(w.hp>=LEVELS[w.level].hp)return {ok:false,text:'Секция целая.'};
  if(this.money<1)return {ok:false,text:'Нет денег на ремонт.'};
  this.job={type:'repair',id,t:0,duration:4};return {ok:true,text:'Ремонт: до 4 секунд. Можно под огнём.'};
 }
 spawn(){
  if(this.builtCount()<6||this.wave>=MAX_WAVES||this.state!=='playing'||this.monsters.some(m=>m.hp>0))return;
  const sectors=this.forecast();this.wave++;
  for(const target of sectors){
   const spread=this.wave>=6;
   const p={x:spread?-195+target*90+(this.random()-.5)*16:(this.random()-.5)*520,y:-205-this.random()*25};const hp=Math.round(Math.round(Math.round(900*Math.pow(1.25,this.wave-1))*1.5)*1.2);
   this.monsters.push({...p,spawnY:p.y,id:this.nextId++,target,level:this.wave,hp,maxHp:hp,damage:Math.round(30*Math.pow(1.20,this.wave-1)),speed:8+Math.min(2,this.wave*.25),cd:0,flash:0,phase:'march'});
  }
  this.phase='battle';this.nextWave=null;this.notice('УРОВЕНЬ '+this.wave+' · '+sectors.map(i=>NAMES[i]).join(' + '));this.record('wave',{wave:this.wave,sectors});
 }
 step(dt,input={}){
  if(this.state!=='playing')return;
  this.time+=dt;this.invulnerable=Math.max(0,this.invulnerable-dt);
  this.incomeClock+=dt;
  const incomeInterval=this.incomeInterval();
  this.walls.forEach((w,i)=>{if(w.hp>0)this.incomeAccrual[i]+=LEVELS[w.level].income*dt/incomeInterval;});
  if(this.incomeClock+1e-8>=incomeInterval){
   const sections=this.incomeAccrual.map((amount,id)=>({id,amount})).filter(s=>s.amount>0);
   const earned=sections.reduce((sum,s)=>sum+s.amount,0);this.money+=earned;this.stats.earned+=earned;
   if(earned>0)this.incomePulses.push({time:this.time,amount:earned,sections});
   if(this.incomePulses.length>8)this.incomePulses.shift();
   this.incomeAccrual.fill(0);this.incomeClock=Math.max(0,this.incomeClock-incomeInterval);
  }
  if(this.phase==='prep'&&this.nextWave!==null&&this.time+1e-8>=this.nextWave&&this.wave<MAX_WAVES)this.spawn();
  let dx=input.x||0,dy=input.y||0;const len=Math.hypot(dx,dy);
  if(len>0){dx/=len;dy/=len;this.player.x=Math.max(FIELD_BOUNDS.left,Math.min(FIELD_BOUNDS.right,this.player.x+dx*145*dt));this.player.y=Math.max(FIELD_BOUNDS.top,Math.min(FIELD_BOUNDS.bottom,this.player.y+dy*145*dt));if(this.job){this.cancelJob();this.notice('Работа отменена: вы отошли. Оплата улучшения возвращена.');}}
  this.updateChests();
  if(this.job){
   const j=this.job,w=this.walls[j.id];j.t+=dt;
   if(j.type==='install'||j.type==='upgrade'){
    if(this.locked(j.id)||this.replacementIssue(j.id,j.level)){this.cancelJob();this.notice(j.type==='upgrade'?'Установка прервана: подойдите к целой стене и дождитесь конца атаки. Доллары возвращены.':'Установка прервана: подойдите к целой стене и дождитесь конца атаки. Комплект сохранён.');}
    else if(j.t+1e-8>=j.duration){w.level=j.level;w.hp=LEVELS[w.level].hp;if(j.type==='install')this.inventory=null;this.job=null;this.stats.installs++;this.record(j.type,{sector:w.id,level:w.level});this.notice(NAMES[w.id]+': установлена стена '+w.level+' ур.');this.effects.push({x:w.x,y:w.y,t:1,type:'build'});}
   }else{
    if(w.hp<=0){this.job=null;}else{
     const heal=Math.min(LEVELS[w.level].hp-w.hp,(32+LEVELS[w.level].hp*.025)*dt,this.money/.15);
     if(heal>0){this.spend(heal*.15);w.hp+=heal;this.stats.repairs+=heal;}
     if(j.t>=j.duration||w.hp>=LEVELS[w.level].hp||this.money<.01)this.job=null;
    }
   }
  }
  for(const w of this.walls){
   w.flash=Math.max(0,w.flash-dt);w.cooldown-=dt;if(w.hp<=0||w.cooldown>0)continue;
   let target=null;let best=230;
   for(const m of this.monsters){const d=dist(w,m);if(m.hp>0&&d<best){best=d;target=m;}}
   if(target){w.cooldown=1;this.bullets.push({x:w.x,y:w.y,target:target.id,damage:this.cannonDamage(w.level),ttl:2});}
  }
  for(const b of this.bullets){
   b.ttl-=dt;const m=this.monsters.find(m=>m.id===b.target&&m.hp>0);if(!m){b.ttl=0;continue;}
   const d=dist(b,m);if(d<460*dt+5){m.hp-=b.damage;m.flash=.1;b.ttl=0;this.effects.push({x:m.x,y:m.y,t:.22,type:'hit'});}else {b.x+=(m.x-b.x)/d*460*dt;b.y+=(m.y-b.y)/d*460*dt;}
  }
  this.bullets=this.bullets.filter(b=>b.ttl>0);
  for(const m of this.monsters){
   m.flash=Math.max(0,m.flash-dt);if(m.hp<=0){const reward=Math.round(250*Math.pow(1.25,m.level-1));this.money+=reward;this.stats.earned+=reward;this.stats.kills++;this.record('kill',{level:m.level});this.notice('Титан повержен. +$'+reward);this.effects.push({x:m.x,y:m.y,t:1,type:'death'});continue;}
   m.cd-=dt;const wall=this.walls[m.target];if(wall.hp<=0&&dist(m,wall)<50)m.breached=true;
   const attacksWall=!m.breached;const objective=attacksWall?wall:this.corePosition;const distance=dist(m,objective);const reach=attacksWall?24:55;
   if(distance>reach){m.phase='march';m.x+=(objective.x-m.x)/distance*m.speed*dt;m.y+=(objective.y-m.y)/distance*m.speed*dt;}
   else {m.phase=attacksWall?'wall':'core';if(m.cd<=0){m.cd=1.6;
    if(attacksWall){wall.hp=Math.max(0,wall.hp-m.damage);wall.lastHit=this.time;wall.flash=.2;
     if(wall.hp===0){this.stats.breaks++;if(this.stats.firstBreach===null)this.stats.firstBreach=this.time;this.record('breach',{sector:wall.id});this.notice('ПРОРЫВ · '+NAMES[wall.id]+'. Титан идёт к ратуше!');}}
    else {const damage=m.damage*2;this.core=Math.max(0,this.core-damage);this.stats.coreLost+=damage;this.effects.push({...this.corePosition,t:.35,type:'hit'});}
   }}
   if(dist(m,this.player)<32&&this.invulnerable===0){this.player={x:65,y:310};this.invulnerable=3;this.cancelJob();this.notice('Титан отбросил вас к ратуше.');}
  }
  this.monsters=this.monsters.filter(m=>m.hp>0);
  this.effects.forEach(e=>e.t-=dt);this.effects=this.effects.filter(e=>e.t>0);
  if(this.core<=0){this.state='lost';this.cancelJob();this.record('end',{result:'lost'});this.notice('Ратуша разрушена. Попробуйте другую стратегию.');}
  else if(this.wave>=MAX_WAVES&&this.monsters.length===0){this.state='won';this.cancelJob();this.record('end',{result:'won'});this.notice('Все 12 волн пережиты. Город спасён!');}
  else if(this.phase==='battle'&&this.monsters.length===0){this.phase='prep';this.nextWave=this.time+this.options.interval;this.bullets=[];this.record('intermission',{nextLevel:this.wave+1,seconds:this.options.interval});this.notice('Уровень '+this.wave+' пройден. До следующего — '+this.options.interval+' секунд.');}
 }
 export(){return {version:'0.14',options:this.options,time:this.time,wave:this.wave,phase:this.phase,nextWave:this.nextWave,state:this.state,core:this.core,money:this.money,incomeUpgraded:this.incomeUpgraded,incomeInterval:this.incomeInterval(),damageUpgraded:this.damageUpgraded,stats:this.stats,walls:this.walls.map(w=>({id:w.id,built:w.built,level:w.level,hp:w.hp})),events:this.log};}
}
const api={Game,MAX_WAVES,WAVE_COUNTS,FIELD_BOUNDS,FIELD_LAYOUT,fieldPoint,fieldFromScreen,CHEST_LIFETIME,CHEST_FREQUENCY,chestReward,LEVELS,NAMES,INCOME_UPGRADE_PRICE,DAMAGE_UPGRADE_PRICE,dist,radial,angle};if(typeof module!=='undefined')module.exports=api;else root.TitanGame=api;
})(typeof window!=='undefined'?window:globalThis);
