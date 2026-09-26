(function(root){
'use strict';
const TAU=Math.PI*2;
const LEVELS=[null,
 {name:'Дерево',hp:180,damage:6,income:5,price:20,color:'#bda078'},
 {name:'Камень',hp:600,damage:19,income:10,price:400,color:'#b5c6bc'},
 {name:'Сталь',hp:1250,damage:43,income:18,price:1100,color:'#9dcbd2'},
 {name:'Бастион',hp:2400,damage:86,income:30,price:2800,color:'#b9b3e5'},
 {name:'Цитадель',hp:4400,damage:160,income:50,price:7000,color:'#efc970'}
];
const NAMES=['Стена 1','Стена 2','Стена 3','Стена 4','Стена 5','Стена 6'];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angle=i=>-Math.PI/2+i*TAU/6;
const radial=(i,r)=>({x:Math.cos(angle(i))*r,y:Math.sin(angle(i))*r});
class Game {
 constructor(options={}){
  this.options={firstWave:10,interval:10,seed:91,prebuilt:false,startingMoney:20,...options};this.time=0;this.money=this.options.startingMoney;this.core=1200;this.wave=0;this.phase=this.options.prebuilt?'prep':'build';
  this.incomeClock=0;this.incomeAccrual=Array(6).fill(0);this.incomePulses=[];
  this.randomState=this.options.seed>>>0;this.plans=Array.from({length:6},(_,wave)=>{const ids=[0,1,2,3,4,5];for(let i=5;i>0;i--){const j=Math.floor(this.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids.slice(0,Math.min(3,Math.ceil((wave+1)/2)));});
  this.corePosition={x:0,y:255};
  this.nextWave=this.options.prebuilt?this.options.firstWave:null;this.player={x:0,y:205};this.shop={x:-125,y:240};this.inventory=null;
  this.walls=Array.from({length:6},(_,i)=>({x:(i-2.5)*100,y:120,id:i,built:this.options.prebuilt,level:1,hp:this.options.prebuilt?180:0,cooldown:0,lastHit:-999,flash:0}));
  this.monsters=[];this.bullets=[];this.effects=[];this.events=[];this.state='playing';this.job=null;
  this.stats={earned:0,spent:0,kills:0,breaks:0,repairs:0,installs:0,builds:0,coreLost:0,firstBreach:null};this.log=[];
  this.nextId=1;this.invulnerable=0;this.notice('Подойдите к зелёной точке и купите первую стену за $20.');
 }
 notice(text){this.events.push({text,time:this.time});if(this.events.length>6)this.events.shift();}
 record(type,data={}){this.log.push({t:Math.round(this.time*10)/10,type,...data});}
 income(){return this.walls.reduce((a,w)=>a+(w.hp>0?LEVELS[w.level].income:0),0);}
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
  if(this.builtCount()===6){this.phase='prep';this.nextWave=this.time+this.options.firstWave;this.record('construction-complete',{firstWave:this.nextWave});}
  return {ok:true,text:this.builtCount()===6?'Шесть стен готовы! Улучшения открыты. Титан через 10 секунд.':'Стена построена! Доход +$5 в секунду.'};
 }
 nearestWall(){return this.walls.reduce((a,w)=>dist(w,this.player)<dist(a,this.player)?w:a,this.walls[0]);}
 random(){this.randomState=(this.randomState*1664525+1013904223)>>>0;return this.randomState/4294967296;}
 forecast(){return [...(this.plans[this.wave]||[])];}
 upgrade(id){
  const w=this.walls[id];if(!w)return {ok:false,text:'Нет такой стены.'};
  if(this.state!=='playing')return {ok:false,text:'Забег завершён.'};
  if(this.builtCount()<6)return {ok:false,text:'Сначала постройте все 6 стен на зелёных точках.'};
  if(this.job)return {ok:false,text:'Дождитесь окончания работы.'};
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
  if(dist(this.player,w)>85)return {ok:false,text:'Подойдите ближе к выбранной секции.'};
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
  if(this.builtCount()<6)return;
  const sectors=this.forecast();this.wave++;
  for(const target of sectors){
   const p={x:(this.random()-.5)*520,y:-205-this.random()*25};const hp=Math.round(900*Math.pow(1.25,this.wave-1));
   this.monsters.push({...p,id:this.nextId++,target,level:this.wave,hp,maxHp:hp,damage:Math.round(30*Math.pow(1.20,this.wave-1)),speed:8+Math.min(2,this.wave*.25),cd:0,flash:0,phase:'march'});
  }
  this.phase='battle';this.nextWave=null;this.notice('УРОВЕНЬ '+this.wave+' · '+sectors.map(i=>NAMES[i]).join(' + '));this.record('wave',{wave:this.wave,sectors});
 }
 step(dt,input={}){
  if(this.state!=='playing')return;
  this.time+=dt;this.invulnerable=Math.max(0,this.invulnerable-dt);
  this.incomeClock+=dt;
  this.walls.forEach((w,i)=>{if(w.hp>0)this.incomeAccrual[i]+=LEVELS[w.level].income*dt;});
  if(this.incomeClock+1e-8>=1){
   const sections=this.incomeAccrual.map((amount,id)=>({id,amount})).filter(s=>s.amount>0);
   const earned=sections.reduce((sum,s)=>sum+s.amount,0);this.money+=earned;this.stats.earned+=earned;
   if(earned>0)this.incomePulses.push({time:this.time,amount:earned,sections});
   if(this.incomePulses.length>8)this.incomePulses.shift();
   this.incomeAccrual.fill(0);this.incomeClock=Math.max(0,this.incomeClock-1);
  }
  if(this.phase==='prep'&&this.nextWave!==null&&this.time+1e-8>=this.nextWave&&this.wave<6)this.spawn();
  let dx=input.x||0,dy=input.y||0;const len=Math.hypot(dx,dy);
  if(len>0){dx/=len;dy/=len;this.player.x=Math.max(-290,Math.min(290,this.player.x+dx*145*dt));this.player.y=Math.max(168,Math.min(310,this.player.y+dy*145*dt));if(this.job){this.cancelJob();this.notice('Работа отменена: вы отошли. Оплата улучшения возвращена.');}}
  if(this.job){
   const j=this.job,w=this.walls[j.id];j.t+=dt;
   if(j.type==='install'||j.type==='upgrade'){
    if(this.locked(j.id)||(j.type==='install'&&dist(this.player,w)>85)){this.cancelJob();this.notice(j.type==='upgrade'?'Установка прервана атакой. Доллары возвращены.':'Установка прервана атакой. Комплект сохранён.');}
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
   if(target){w.cooldown=1;this.bullets.push({x:w.x,y:w.y,target:target.id,damage:LEVELS[w.level].damage,ttl:2});}
  }
  for(const b of this.bullets){
   b.ttl-=dt;const m=this.monsters.find(m=>m.id===b.target&&m.hp>0);if(!m){b.ttl=0;continue;}
   const d=dist(b,m);if(d<460*dt+5){m.hp-=b.damage;m.flash=.1;b.ttl=0;this.effects.push({x:m.x,y:m.y,t:.22,type:'hit'});}else {b.x+=(m.x-b.x)/d*460*dt;b.y+=(m.y-b.y)/d*460*dt;}
  }
  this.bullets=this.bullets.filter(b=>b.ttl>0);
  for(const m of this.monsters){
   m.flash=Math.max(0,m.flash-dt);if(m.hp<=0){const reward=Math.round(250*Math.pow(1.25,m.level-1));this.money+=reward;this.stats.earned+=reward;this.stats.kills++;this.record('kill',{level:m.level});this.notice('Титан повержен. +$'+reward);this.effects.push({x:m.x,y:m.y,t:1,type:'death'});continue;}
   m.cd-=dt;const wall=this.walls[m.target];if(wall.hp<=0&&dist(m,wall)<50)m.breached=true;
   const attacksWall=!m.breached;const objective=attacksWall?wall:this.corePosition;const distance=dist(m,objective);const reach=attacksWall?43:55;
   if(distance>reach){m.phase='march';m.x+=(objective.x-m.x)/distance*m.speed*dt;m.y+=(objective.y-m.y)/distance*m.speed*dt;}
   else {m.phase=attacksWall?'wall':'core';if(m.cd<=0){m.cd=1.6;
    if(attacksWall){wall.hp=Math.max(0,wall.hp-m.damage);wall.lastHit=this.time;wall.flash=.2;
     if(wall.hp===0){this.stats.breaks++;if(this.stats.firstBreach===null)this.stats.firstBreach=this.time;this.record('breach',{sector:wall.id});this.notice('ПРОРЫВ · '+NAMES[wall.id]+'. Титан идёт к ратуше!');}}
    else {const damage=m.damage*2;this.core=Math.max(0,this.core-damage);this.stats.coreLost+=damage;this.effects.push({...this.corePosition,t:.35,type:'hit'});}
   }}
   if(dist(m,this.player)<32&&this.invulnerable===0){this.player={x:65,y:275};this.invulnerable=3;this.cancelJob();this.notice('Титан отбросил вас к ратуше.');}
  }
  this.monsters=this.monsters.filter(m=>m.hp>0);
  this.effects.forEach(e=>e.t-=dt);this.effects=this.effects.filter(e=>e.t>0);
  if(this.core<=0){this.state='lost';this.cancelJob();this.record('end',{result:'lost'});this.notice('Ратуша разрушена. Попробуйте другую стратегию.');}
  else if(this.wave>=6&&this.monsters.length===0){this.state='won';this.cancelJob();this.record('end',{result:'won'});this.notice('Шесть волн пережиты. Город спасён!');}
  else if(this.phase==='battle'&&this.monsters.length===0){this.phase='prep';this.nextWave=this.time+this.options.interval;this.bullets=[];this.record('intermission',{nextLevel:this.wave+1,seconds:this.options.interval});this.notice('Уровень '+this.wave+' пройден. До следующего — 10 секунд.');}
 }
 export(){return {version:'0.7',options:this.options,time:this.time,wave:this.wave,phase:this.phase,nextWave:this.nextWave,state:this.state,core:this.core,money:this.money,stats:this.stats,walls:this.walls.map(w=>({id:w.id,built:w.built,level:w.level,hp:w.hp})),events:this.log};}
}
const api={Game,LEVELS,NAMES,dist,radial,angle};if(typeof module!=='undefined')module.exports=api;else root.TitanGame=api;
})(typeof window!=='undefined'?window:globalThis);
