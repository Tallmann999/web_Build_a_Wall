function worldPoint(p){return{x:60+(p.x+315)*1800/630,y:p.y<=120?120+(p.y+335)*636/455:756+(p.y-120)*284/215};}
function worldFromScreen(p){return{x:(p.x-60)*630/1800-315,y:p.y<=756?(p.y-120)*455/636-335:(p.y-756)*215/284+120};}
function resizeLayout(){const scale=Math.min(innerWidth/cw,innerHeight/ch),stage=$('gameStage');stage.style.transform=`scale(${scale})`;stage.style.left=(innerWidth-cw*scale)/2+'px';stage.style.top=(innerHeight-ch*scale)/2+'px';ctx.imageSmoothingEnabled=false;}
window.addEventListener('resize',resizeLayout);document.addEventListener('fullscreenchange',resizeLayout);
function imageAt(s,x,y,scale=1){ctx.drawImage(s,Math.round(x-s.width*scale/2),Math.round(y-s.height*scale),s.width*scale,s.height*scale);}
function label(text,x,y,color='#eff5d6',size=18,back=true){ctx.font=`800 ${size}px 'Segoe UI',sans-serif`;ctx.textAlign='center';const w=ctx.measureText(text).width;if(back){ctx.fillStyle='#20382de0';ctx.fillRect(x-w/2-10,y-size-3,w+20,size+13);}ctx.fillStyle=color;ctx.fillText(text,x,y);}
function hpBar(x,y,w,value,max,color){ctx.fillStyle='#23362b';ctx.fillRect(x-w/2-2,y-2,w+4,12);ctx.fillStyle='#2c4637';ctx.fillRect(x-w/2,y,w,8);ctx.fillStyle=color;ctx.fillRect(x-w/2,y,Math.max(0,w*value/max),8);}
function drawWall(w){
 const p=worldPoint(w),v=LEVELS[w.level],targeted=game.monsters.some(m=>m.target===w.id&&!m.breached)||(game.phase==='prep'&&game.forecast().includes(w.id));
 if(!w.built){ctx.strokeStyle='#8ddc8277';ctx.lineWidth=2;ctx.setLineDash([8,9]);ctx.strokeRect(p.x-125,p.y-18,250,36);ctx.setLineDash([]);return;}
 ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.7);
 if(w.hp<=0){for(let i=0;i<12;i++){ctx.fillStyle=i%2?'#899074':'#58654b';ctx.fillRect(-131+i*23,(i%3)*8-8,18,12);}}
 else{
  ctx.fillStyle='#22372977';ctx.fillRect(-137,5,274,52);ctx.fillStyle=w.flash>0?'#ffd1ac':v.color;ctx.fillRect(-135,-25,270,52);ctx.fillStyle=w.level===1?'#806448':'#617582';ctx.fillRect(-135,21,270,15);
  ctx.fillStyle='#ece4bc';ctx.fillRect(-135,-25,270,5);ctx.fillStyle='#47534588';
  for(let i=-135;i<135;i+=30){ctx.fillRect(i,-19,3,40);ctx.fillRect(i+15,24,3,12);}ctx.fillRect(-135,2,270,3);
  for(let i=-135;i<135;i+=45){ctx.fillStyle=v.color;ctx.fillRect(i,-42,23,18);ctx.fillStyle='#f0e9c7';ctx.fillRect(i,-42,23,4);}
  if(w.hp/v.hp<.4){ctx.strokeStyle='#364635';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(80,-20);ctx.lineTo(65,0);ctx.lineTo(83,12);ctx.lineTo(64,28);ctx.stroke();}
 }
 if(targeted||wallMenuOpen&&w.id===selected){ctx.strokeStyle=wallMenuOpen&&w.id===selected?'#e4ff93':'#ffbc66';ctx.lineWidth=5;ctx.strokeRect(-139,-46,278,87);}
 if(w.hp>0){const t=game.monsters.filter(m=>dist(w,m)<230).sort((a,b)=>dist(w,a)-dist(w,b))[0],tp=t?worldPoint(t):{x:p.x,y:p.y-100};ctx.rotate(Math.atan2(tp.y-p.y,tp.x-p.x));rect(ctx,'#354b43',-20,-20,40,40);rect(ctx,'#263a37',-14,-14,29,28);rect(ctx,'#9db4b0',-5,-10,44,20);rect(ctx,'#1a302e',34,-12,9,24);}
 ctx.restore();hpBar(p.x,p.y+30,190,w.hp,v.hp,w.hp/v.hp<.35?'#ffa282':'#b9ed8a');label(`${w.id+1} · ${v.name} · ур. ${w.level}`,p.x,p.y-43,'#f8f7de',17);label(w.hp>0?`+$${v.income} / сек`:'Нет дохода',p.x,p.y+59,w.hp>0?'#9affb2':'#ffc6a4',20);
 if(game.job?.id===w.id){hpBar(p.x,p.y+75,180,game.job.t,game.job.duration,'#ffe992');label((game.job.type==='repair'?'Ремонт: ':'Установка: ')+Math.max(0,game.job.duration-game.job.t).toFixed(1)+' с',p.x,p.y-72,'#fff0a6',18);}
}
function drawRoute(m){const p=worldPoint(m),t=worldPoint(m.breached?game.corePosition:game.walls[m.target]);ctx.strokeStyle=m.breached?'#ff8069':'#ffd591';ctx.lineWidth=4;ctx.setLineDash([10,13]);ctx.lineDashOffset=-game.time*22;ctx.beginPath();ctx.moveTo(p.x,p.y+8);ctx.lineTo(t.x,t.y-46);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;for(const f of [.35,.7]){ctx.save();ctx.translate(p.x+(t.x-p.x)*f,p.y+(t.y-46-p.y)*f);ctx.rotate(Math.atan2(t.y-46-p.y,t.x-p.x));ctx.fillStyle='#ffe3a4';ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-9,-8);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();ctx.restore();}}
function drawScenery(){
 ctx.drawImage(terrain,0,0,cw,ch);ctx.fillStyle='#638354';ctx.fillRect(0,756,cw,324);
 ctx.fillStyle='#92a075';ctx.fillRect(0,825,cw,33);ctx.fillRect(930,850,60,230);ctx.fillRect(410,937,1090,34);
 ctx.fillStyle='#788f6066';for(let i=0;i<28;i++){const x=(i*241)%1920,y=800+(i*107)%265;ctx.fillRect(x,y,14,3);}
 for(const w of game.walls){const p=worldPoint(w);ctx.fillStyle='#d4d9890b';ctx.fillRect(p.x-120,175,240,535);}
 for(let i=0;i<11;i++)imageAt(i%3?tree:pine,24+i*184,181+(i%3)*21,1.35);
 for(const p of [{x:-240,y:270},{x:-208,y:317},{x:170,y:285},{x:245,y:320}]){const s=worldPoint(p);imageAt(house,s.x,s.y,1.7);}
 const core=worldPoint(game.corePosition);imageAt(townhall,core.x,core.y+28,1.8);label('РАТУША',core.x,core.y+53,'#f7f1c7',15);
 const sp=worldPoint(game.shop),aura=ctx.createRadialGradient(sp.x,sp.y-10,10,sp.x,sp.y-10,115);aura.addColorStop(0,'#d394ff99');aura.addColorStop(.55,'#ad54ff55');aura.addColorStop(1,'#973aff00');ctx.fillStyle=aura;ctx.fillRect(sp.x-120,sp.y-125,240,200);ctx.strokeStyle='#d5a1ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(sp.x,sp.y+2,76,22,0,0,Math.PI*2);ctx.stroke();
 imageAt(market,sp.x,sp.y,1.9);$('shopBeacon').style.left=sp.x+'px';$('shopBeacon').style.top=sp.y+20+'px';
 if(game.phase==='prep')for(const id of game.forecast()){const p=worldPoint(game.walls[id]);ctx.fillStyle='#ffc6731e';ctx.fillRect(p.x-130,210,260,505);label('↓ ЦЕЛЬ: СТЕНА '+(id+1),p.x,260,'#ffdda5',18);}
}
function drawActors(){
 if(destination){const p=worldPoint(game.player),t=worldPoint(destination);ctx.strokeStyle='#ebffad';ctx.lineWidth=3;ctx.setLineDash([5,9]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.setLineDash([]);ctx.strokeRect(t.x-8,t.y-8,16,16);}
 for(const m of [...game.monsters].sort((a,b)=>a.y-b.y)){const p=worldPoint(m);ctx.fillStyle='#20312377';ctx.beginPath();ctx.ellipse(p.x,p.y,43,14,0,0,Math.PI*2);ctx.fill();if(m.flash>0)ctx.globalAlpha=.6;imageAt(titans[Math.min(6,m.level)],p.x,p.y+(m.phase==='march'?Math.sin(game.time*5)*3:0),2.05);ctx.globalAlpha=1;hpBar(p.x,p.y<350?p.y+12:p.y-149,110,m.hp,m.maxHp,'#ffb083');label(`ТИТАН ${m.level} → ${m.breached?'ГОРОД':'СТЕНА '+(m.target+1)}`,p.x,p.y<350?p.y+45:p.y-164,'#ffe4b7',17);}
 const p=worldPoint(game.player);ctx.strokeStyle='#efffb9';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(p.x,p.y,18,8,0,0,Math.PI*2);ctx.stroke();imageAt(player,p.x,p.y,1.5);label('ВЫ',p.x,p.y+23,'#eeffb2',13);
 ctx.fillStyle='#fff3b0';for(const b of game.bullets){const p=worldPoint(b);ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();}
 for(const e of game.effects){const p=worldPoint(e),r=(1-e.t)*35+12;ctx.globalAlpha=Math.min(1,e.t*3);ctx.strokeStyle='#ffe7a2';ctx.lineWidth=4;ctx.strokeRect(p.x-r,p.y-r,r*2,r*2);ctx.globalAlpha=1;}
}
function collectIncome(){for(const pulse of game.incomePulses.splice(0)){
 for(const part of pulse.sections){const p=worldPoint(game.walls[part.id]);cashFlights.push({x:p.x,y:p.y-62,age:0,duration:1.35+part.id*.06,id:part.id});incomeLabels.push({x:p.x,y:p.y-68,age:0,amount:part.amount});}
 $('cashGain').textContent='+'+cash(pulse.amount);cashFlashUntil=performance.now()+900;$('wallet').classList.remove('flash');void $('wallet').offsetWidth;$('wallet').classList.add('flash');ftueTicks++;
 }cashFlights=cashFlights.slice(-90);incomeLabels=incomeLabels.slice(-36);}
function drawCash(dt){
 for(const f of cashFlights){if(!paused)f.age+=dt;const t=Math.min(1,f.age/f.duration),u=1-t,x=u*u*f.x+2*u*t*(f.x-80)+t*t*160,y=u*u*f.y+2*u*t*40+t*t*100;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*12+f.id)*.22);ctx.globalAlpha=t>.9?(1-t)*10:1;ctx.fillStyle='#164c32';ctx.fillRect(-26,-15,52,30);ctx.fillStyle='#70f79a';ctx.fillRect(-23,-12,46,24);ctx.strokeStyle='#24a95a';ctx.lineWidth=2;ctx.strokeRect(-19,-8,38,16);ctx.fillStyle='#197b42';ctx.font='900 22px Segoe UI';ctx.textAlign='center';ctx.fillText('$',0,8);ctx.fillStyle='#eaffc6';ctx.fillRect(-32,-21,5,5);ctx.fillRect(32,15,3,3);ctx.restore();}
 for(const f of incomeLabels){if(!paused)f.age+=dt;ctx.globalAlpha=Math.max(0,1-f.age/1.1);ctx.font='900 27px Segoe UI';ctx.textAlign='center';ctx.strokeStyle='#183a29';ctx.lineWidth=5;ctx.strokeText('+'+cash(f.amount),f.x,f.y-f.age*50);ctx.fillStyle='#86ffa6';ctx.fillText('+'+cash(f.amount),f.x,f.y-f.age*50);ctx.globalAlpha=1;}
 cashFlights=cashFlights.filter(f=>f.age<f.duration);incomeLabels=incomeLabels.filter(f=>f.age<1.1);if(performance.now()>cashFlashUntil)$('wallet').classList.remove('flash');
}
function draw(dt){ctx.clearRect(0,0,cw,ch);drawScenery();for(const m of game.monsters)drawRoute(m);for(const w of game.walls)drawWall(w);drawActors();drawCash(dt);positionWallMenu();}
function movement(){
 if(pendingWork&&dist(game.player,game.walls[pendingWork.id])<=80){const job=pendingWork;pendingWork=null;destination=null;response(job.type==='install'?game.install(job.id):game.repair(job.id));}
 let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
 if(!x&&!y&&destination){const d=dist(game.player,destination);if(d<3)destination=null;else{x=(destination.x-game.player.x)/d;y=(destination.y-game.player.y)/d;}}return{x,y};
}
function frame(now){const dt=Math.min(.1,(now-lastFrame)/1000||0);lastFrame=now;if(started&&!paused&&game.state==='playing'){accumulator+=dt*speed;while(accumulator>=1/60){game.step(1/60,movement());accumulator-=1/60;}}else accumulator=0;collectIncome();if(game.stats.installs>installedCount){installedCount=game.stats.installs;if(ftue===3)finishFtue();}if(now>toastUntil)$('toast').classList.remove('show');uiClock+=dt;if(uiClock>.12){updateUI();uiClock=0;}if(started)draw(dt);requestAnimationFrame(frame);}
setMaterial(2,false);resizeLayout();updateUI();requestAnimationFrame(frame);
