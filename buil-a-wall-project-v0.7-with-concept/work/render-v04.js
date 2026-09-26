const worldPoint=fieldPoint,worldFromScreen=fieldFromScreen;
function titanAppearance(m){
 const p=worldPoint(m),name=m.level<=3?'titan-clay':m.level<=6?'titan-stone':m.level<=9?'titan-armored':'titan-boss';
 const depth=Math.max(0,Math.min(1,(p.y-FIELD_LAYOUT.horizon)/(FIELD_LAYOUT.wallY-FIELD_LAYOUT.horizon)));
 const width=(m.level>=10?185:155)*(.62+.38*depth),height=width*ART.frames[name].h/ART.frames[name].w;
 const groundY=worldFromScreen({x:p.x,y:FIELD_LAYOUT.horizon}).y;
 const emerge=Math.max(0,Math.min(1,(m.y-(m.spawnY??groundY))/(groundY-(m.spawnY??groundY)||1)));
 return {x:p.x,y:emerge<1?FIELD_LAYOUT.horizon+height*.78*(1-emerge):p.y,width,height,name,emerge};
}
function drawRepairTimer(w){
 const p=worldPoint(w),job=game.job,progress=Math.min(1,job.t/job.duration),x=p.x,y=p.y-65;
 const beat=(job.t% .5)/.5,strike=beat>.72;
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#162d48ee';ctx.strokeStyle='#d9edff';ctx.lineWidth=3;
 ctx.beginPath();ctx.arc(0,0,51,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.strokeStyle='#345370';ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,44,0,Math.PI*2);ctx.stroke();
 if(progress>0){ctx.strokeStyle='#76ef46';ctx.lineCap='round';ctx.beginPath();ctx.arc(0,0,44,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();}
 ctx.fillStyle=strike?'#fff4a4':'#ffbd46';ctx.beginPath();ctx.arc(-10,7,strike?8:5,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(5,-9);ctx.rotate(-.8+Math.min(1,beat/.76)*1.15);drawSprite('hammer',-22,-28,42,42);ctx.restore();
 if(strike){ctx.strokeStyle='#ffe68a';ctx.lineWidth=2;for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.moveTo(-10+Math.cos(a)*11,7+Math.sin(a)*11);ctx.lineTo(-10+Math.cos(a)*17,7+Math.sin(a)*17);ctx.stroke();}}
 label(Math.max(0,job.duration-job.t).toFixed(1)+' с',0,33,'#fff5ce',16,false);ctx.restore();
}
function resizeLayout(){const scale=Math.min(innerWidth/cw,innerHeight/ch),stage=$('gameStage');stage.style.transform=`scale(${scale})`;stage.style.left=(innerWidth-cw*scale)/2+'px';stage.style.top=(innerHeight-ch*scale)/2+'px';ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';}
window.addEventListener('resize',resizeLayout);document.addEventListener('fullscreenchange',resizeLayout);
function label(text,x,y,color='#fff9de',size=18,back=true){ctx.font=`800 ${size}px 'Segoe UI',sans-serif`;ctx.textAlign='center';const w=ctx.measureText(text).width;if(back){ctx.fillStyle='#18384bda';ctx.beginPath();ctx.roundRect(x-w/2-10,y-size-3,w+20,size+13,7);ctx.fill();}ctx.fillStyle=color;ctx.fillText(text,x,y);}
function hpBar(x,y,w,value,max,color){ctx.fillStyle='#172b46';ctx.beginPath();ctx.roundRect(x-w/2-3,y-3,w+6,14,6);ctx.fill();ctx.fillStyle='#34445b';ctx.fillRect(x-w/2,y,w,8);ctx.fillStyle=color;ctx.fillRect(x-w/2,y,Math.max(0,w*value/max),8);}
function drawWall(w){
 const p=worldPoint(w),v=LEVELS[w.level],targeted=game.monsters.some(m=>m.target===w.id&&!m.breached)||(game.phase==='prep'&&game.forecast().includes(w.id));
 if(!w.built){ctx.globalAlpha=.42;drawSprite('wall-foundation',p.x-130,p.y+2,260,36);ctx.globalAlpha=1;return;}
 if(targeted||wallMenuOpen&&w.id===selected){ctx.fillStyle=wallMenuOpen&&w.id===selected?'#80e8ff55':'#ff6d4055';ctx.beginPath();ctx.ellipse(p.x,p.y+2,144,30,0,0,Math.PI*2);ctx.fill();}
 const state=w.hp<=0?'rubble':w.hp/v.hp<.5?'damaged':'wall';
 if(w.flash>0)ctx.globalAlpha=.65;
 spriteAt(state+'-'+w.level,p.x,p.y+8,266);ctx.globalAlpha=1;
 if(w.hp>0){
  const t=game.monsters.filter(m=>dist(w,m)<230).sort((a,b)=>dist(w,a)-dist(w,b))[0],tp=t?worldPoint(t):{x:p.x,y:p.y-100};
  ctx.save();ctx.translate(p.x,p.y-65);if(tp.x<p.x)ctx.scale(-1,1);drawSprite('cannon-'+w.level,-42,-36,84,72);ctx.restore();
  if(t&&w.cooldown>.88){ctx.save();ctx.translate(p.x+(tp.x<p.x?-35:35),p.y-92);drawSprite('burst',-20,-20,40,40);ctx.restore();}
 }
 hpBar(p.x,p.y+23,185,w.hp,v.hp,w.hp/v.hp<.35?'#ff754e':'#91ef30');
 label(`${w.id+1}`,p.x-116,p.y+56,'#fff9de',16);
 label(w.hp>0?payoutLabel(v.income):'ВОССТАНОВИТЬ',p.x,p.y+56,w.hp>0?'#c4ff87':'#ffbd97',18);
 if(game.job?.id===w.id){if(game.job.type==='repair')drawRepairTimer(w);else{hpBar(p.x,p.y+75,180,game.job.t,game.job.duration,'#ffd24c');spriteAt('build-glow',p.x,p.y-45,94);label('Установка: '+Math.max(0,game.job.duration-game.job.t).toFixed(1)+' с',p.x,p.y-181,'#fff0a6',18);}}
}
function drawRoute(m){
 if(m.phase!=='march'||titanAppearance(m).emerge<1)return;
 const p=worldPoint(m),target=m.breached?game.corePosition:game.walls[m.target],t=worldPoint({...target,y:target.y-(m.breached?55:24)}),endY=t.y,color=m.breached?'#ff6842':'#ffeb39';
 ctx.save();ctx.lineCap='round';ctx.setLineDash([18,17]);ctx.lineDashOffset=-game.time*36;
 ctx.beginPath();ctx.moveTo(p.x,p.y+8);ctx.lineTo(t.x,endY);
 ctx.strokeStyle='#4a240e';ctx.lineWidth=12;ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=6;ctx.stroke();ctx.setLineDash([]);
 const length=Math.hypot(t.x-p.x,endY-p.y),count=Math.max(1,Math.floor(length/110));
 for(let i=0;i<count;i++){const f=(i+.5)/count;drawDirectionArrow(p.x+(t.x-p.x)*f,p.y+(endY-p.y)*f,Math.atan2(endY-p.y,t.x-p.x),color,25);}
 ctx.restore();
}
function drawDirectionArrow(x,y,rotation,color,size){
 ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.beginPath();ctx.moveTo(size,0);ctx.lineTo(-size*.55,-size*.8);ctx.lineTo(-size*.2,0);ctx.lineTo(-size*.55,size*.8);ctx.closePath();
 ctx.lineJoin='round';ctx.strokeStyle='#572412';ctx.lineWidth=10;ctx.stroke();ctx.strokeStyle='#fffde0';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle=color;ctx.fill();ctx.restore();
}
let sceneryCache=null;
const townObjects=[
 {name:'market',x:603,y:1070,w:192},{name:'townhall',x:960,y:1070,w:236},
 {name:'tree',x:42,y:954,w:73},{name:'tree',x:1878,y:973,w:85},
 {name:'lamp',x:771,y:1070,w:30},{name:'lamp',x:1130,y:977,w:30}
];
function makeScenery(){
 const c=document.createElement('canvas');c.width=cw;c.height=ch;const q=c.getContext('2d');q.imageSmoothingQuality='high';
 const art=(name,x,y,w,h)=>{const f=ART.frames[name];q.drawImage(atlasImages[f.page],f.x,f.y,f.w,f.h,x,y,w,h??w*f.h/f.w);};
 q.fillStyle='#8fcb45';q.fillRect(0,0,cw,ch);
 art('sky-day',0,0,1920,275);art('landscape-day',0,143,1920,231);
 const g=q.createLinearGradient(0,300,0,790);g.addColorStop(0,'#91c94b');g.addColorStop(1,'#6eb33e');q.fillStyle=g;q.fillRect(0,330,1920,750);
 for(let i=0;i<42;i++){const x=(i*431+73)%1870,y=355+(i*83)%252;art(i%6===0?'rock-grass':i%4===0?'bush-flowers':'grass-a',x,y,i%6===0?36:24);}
 const plaza=q.createLinearGradient(0,740,0,1080);plaza.addColorStop(0,'#7dc043');plaza.addColorStop(1,'#67ae39');q.fillStyle=plaza;q.fillRect(0,740,1920,340);
 for(let i=0;i<24;i++)art('grass-a',50+(i*337)%1800,640+(i*71)%270,26);
 art('terrain-flat',0,985,1920,95);
 art('road-long',0,970,1920,95);
 // Walkable plaza behind the walls, plus a path to the town hall.
 art('city-path',0,809,960,60);art('city-path',960,809,960,60);
 art('city-stone',857,1000,208,62);
 for(const [x,y,w] of [[38,474,91],[1834,493,100],[20,665,115],[1834,682,100]])art('tree-pine',x,y,w);
 return c;
}
function drawScenery(){
 if(!artReady)return;if(!sceneryCache)sceneryCache=makeScenery();ctx.drawImage(sceneryCache,0,0);
 const sp=worldPoint(game.shop);$('shopBeacon').style.left=sp.x+'px';$('shopBeacon').style.top='1005px';
 if(game.phase==='prep')for(const id of game.forecast()){const p=worldPoint(game.walls[id]);ctx.fillStyle='#ffdc3928';ctx.fillRect(p.x-130,FIELD_LAYOUT.horizon,260,p.y-FIELD_LAYOUT.horizon);}
}
function drawActors(){
 if(destination){const p=worldPoint(game.player),t=worldPoint(destination);ctx.strokeStyle='#fff4af';ctx.lineWidth=3;ctx.setLineDash([5,9]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.setLineDash([]);spriteAt('build-dot-1',t.x,t.y+8,24);}
 const objects=townObjects.map(o=>({...o,type:'scenery'}));
 for(const w of game.walls){const p=worldPoint(w);objects.push({type:'wall',wall:w,x:p.x,y:p.y});}
 for(const m of game.monsters){const p=worldPoint(m);objects.push({type:'monster',m,x:p.x,y:p.y});}
 for(const chest of game.chests){const p=worldPoint(chest);objects.push({type:'chest',chest,x:p.x,y:p.y});}
 const p=worldPoint(game.player);objects.push({type:'player',x:p.x,y:p.y});
 for(const o of objects.sort((a,b)=>a.y-b.y)){
  if(o.type==='chest'){ctx.save();ctx.shadowColor='#ffdc45';ctx.shadowBlur=18+Math.sin(game.time*4)*6;spriteAt('chest',o.x,o.y,82);ctx.restore();label(cash(o.chest.amount),o.x,o.y+24,'#ffe875',18);continue;}
  if(o.type==='wall'){drawWall(o.wall);continue;}
  if(o.type==='scenery'){spriteAt(o.name,o.x,o.y,o.w);continue;}
  if(o.type==='player'||titanAppearance(o.m).emerge>=1){ctx.fillStyle='#25422255';ctx.beginPath();ctx.ellipse(o.x,o.y,o.type==='player'?24:titanAppearance(o.m).width*.4,10,0,0,Math.PI*2);ctx.fill();}
  if(o.type==='player'){
   const moving=keys.size>0||destination;const name=game.job?.type==='repair'?'engineer':game.inventory?'builder-plan':moving?'builder-side':'builder';
   const width=82*ART.frames[name].w/ART.frames[name].h;
   ctx.save();ctx.translate(o.x,o.y+(moving?Math.sin(game.time*12)*2:0));if(name==='builder-side'&&(keys.has('KeyA')||keys.has('ArrowLeft')||destination&&destination.x<game.player.x))ctx.scale(-1,1);spriteAt(name,0,0,width);ctx.restore();label('ВЫ',o.x,o.y+23,'#fff5b3',13);continue;
  }
  const m=o.m,a=titanAppearance(m),hitting=m.phase==='wall'||m.phase==='core',strike=hitting?Math.max(0,(m.cd-1.25)/.35):0;
  ctx.save();if(a.emerge<1){ctx.beginPath();ctx.rect(0,0,cw,FIELD_LAYOUT.horizon);ctx.clip();}
  if(m.flash>0)ctx.globalAlpha=.6;
  spriteAt(a.name,a.x,a.y+(m.phase==='march'&&a.emerge>=1?Math.sin(game.time*5)*3:0)+strike*10,a.width);
  ctx.restore();
  if(a.emerge>=1){hpBar(a.x,a.y-a.height-8,100,m.hp,m.maxHp,'#ff6654');label(`УР. ${m.level}`,a.x,a.y-a.height-22,'#ffe4b7',17);}
  if(strike>0&&m.phase==='wall'){const contact=worldPoint(game.walls[m.target]);spriteAt('impact',a.x,contact.y-75,35+strike*20);}
 }
 for(const b of game.bullets){const p=worldPoint(b);drawSprite('cannonball',p.x-9,p.y-64,18,18);}
 for(const e of game.effects){const p=worldPoint(e),size=e.type==='build'?112:e.type==='death'?122:55;ctx.globalAlpha=Math.min(1,e.t*4);spriteAt(e.type==='build'?'build-glow':e.type==='death'?'smoke':'impact',p.x,p.y+(e.type==='hit'?-50:size/3),size);ctx.globalAlpha=1;}
}
function collectIncome(){for(const pulse of game.incomePulses.splice(0)){
 for(const part of pulse.sections){const p=worldPoint(game.walls[part.id]);incomeLabels=incomeLabels.filter(f=>f.id!==part.id);incomeLabels.push({id:part.id,x:p.x,y:p.y-180,age:0,amount:part.amount});}
 $('cashGain').textContent='+'+cash(pulse.amount);cashFlashUntil=performance.now()+900;$('wallet').classList.remove('flash');void $('wallet').offsetWidth;$('wallet').classList.add('flash');ftueTicks++;
 }incomeLabels=incomeLabels.slice(-36);
 for(const pulse of game.chestPulses.splice(0)){const p=worldPoint(pulse);incomeLabels.push({id:'chest-'+game.time,x:p.x,y:p.y-50,age:0,amount:pulse.amount});$('cashGain').textContent='+'+cash(pulse.amount);cashFlashUntil=performance.now()+900;$('wallet').classList.add('flash');toast('Сундук найден! +'+cash(pulse.amount));}
}
function drawCash(dt){
 for(const f of incomeLabels){
  if(!paused)f.age+=dt;const t=Math.min(1,f.age/.95),y=f.y-44*(1-Math.pow(1-t,2));
  ctx.globalAlpha=t<.45?1:Math.max(0,(1-t)/.55);
  drawSprite('cash-stack',f.x-47,y-24,34,28);
  ctx.font='900 25px Segoe UI';ctx.textAlign='left';ctx.strokeStyle='#183a29';ctx.lineWidth=5;ctx.strokeText('+'+cash(f.amount),f.x-7,y);ctx.fillStyle='#bbff87';ctx.fillText('+'+cash(f.amount),f.x-7,y);ctx.globalAlpha=1;
 }
 incomeLabels=incomeLabels.filter(f=>f.age<.95);
 if(performance.now()>cashFlashUntil){$('wallet').classList.remove('flash');$('cashGain').textContent='';}
}
function draw(dt){ctx.clearRect(0,0,cw,ch);drawScenery();for(const m of game.monsters)drawRoute(m);drawActors();drawCash(dt);positionWallMenu();}
function movement(){
 if(pendingWork&&dist(game.player,game.walls[pendingWork.id])<=80){const job=pendingWork;pendingWork=null;destination=null;response(job.type==='install'?game.install(job.id):game.repair(job.id));}
 let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
 if(!x&&!y&&destination){const d=dist(game.player,destination);if(d<3)destination=null;else{x=(destination.x-game.player.x)/d;y=(destination.y-game.player.y)/d;}}return{x,y};
}
function frame(now){const dt=Math.min(.1,(now-lastFrame)/1000||0);lastFrame=now;if(started&&!paused&&game.state==='playing'){accumulator+=dt*speed;while(accumulator>=1/60){game.step(1/60,movement());accumulator-=1/60;}}else accumulator=0;collectIncome();if(game.stats.installs>installedCount){installedCount=game.stats.installs;if(ftue===3)finishFtue();}if(now>toastUntil)$('toast').classList.remove('show');uiClock+=dt;if(uiClock>.12){updateUI();uiClock=0;}if(started)draw(dt);requestAnimationFrame(frame);}
setMaterial(2,false);resizeLayout();updateUI();requestAnimationFrame(frame);
