'use strict';
const {Game,MAX_WAVES,FIELD_BOUNDS,FIELD_LAYOUT,fieldPoint,fieldFromScreen,LEVELS,NAMES,INCOME_UPGRADE_PRICE,DAMAGE_UPGRADE_PRICE,dist}=TitanGame;
const $=id=>document.getElementById(id),cash=n=>'$'+Math.floor(n+1e-7).toLocaleString('ru-RU'),number=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2});
const clock=t=>`${String(Math.floor(Math.max(0,t)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,t)%60)).padStart(2,'0')}`;
const makeGame=()=>new Game({seed:Date.now()>>>0});
let started=false,lastNearSite=null;
let game=makeGame(),selected=0,paused=false,speed=1,wallMenuOpen=false,destination=null,pendingWork=null,lastFrame=0,accumulator=0,uiClock=0,endShown=false,toastUntil=0,helpWasPaused=false;
let activeShopTab='walls',speedTipDismissed=false;
const payoutLabel=amount=>'+'+cash(amount)+' / '+game.incomeInterval()+' сек';
const rateLabel=amount=>'$'+number(amount)+' / сек';
let activeMaterial=2,ftue=0,ftueTicks=0,ftueDoneUntil=0,cashFlashUntil=0,incomeLabels=[],installedCount=0;
// Test build: show the short tutorial after each fresh entry.
const keys=new Set(),canvas=$('game'),ctx=canvas.getContext('2d');
const cw=1920,ch=1080,dpr=1;
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');toastUntil=performance.now()+2800;}
function response(r){toast(r.text);updateUI();return r.ok;}
function finishFtue(){ftue=4;ftueDoneUntil=performance.now()+3500;try{localStorage.setItem('buil-a-wall-ftue-v04','done');}catch{}updateFtue();}
function newGame(){setShopTab('walls');speedTipDismissed=false;speed=1;$('speed').value='1';ftue=0;ftueTicks=0;ftueDoneUntil=0;lastNearSite=null;game=makeGame();selected=0;paused=false;wallMenuOpen=false;destination=null;pendingWork=null;endShown=false;accumulator=0;incomeLabels=[];installedCount=0;keys.clear();for(const id of ['shopModal','helpModal','endModal'])$(id).hidden=true;updateUI();}
function startGame(){
 if(started||!artReady)return;
 ftue=0;ftueTicks=0;ftueDoneUntil=0;speed=1;$('speed').value='1';
 started=true;$('startScreen').hidden=true;$('playSurface').hidden=false;
 lastFrame=performance.now();newGame();canvas.focus({preventScroll:true});
}
$('startPlaying').onclick=startGame;
$('startPlaying').disabled=true;
assetsReady.then(()=>{$('startPlaying').disabled=false;$('assetStatus').textContent='';}).catch(()=>{$('assetStatus').textContent='Не удалось загрузить графику. Обновите страницу.';});
function openShop(){
 if(game.state!=='playing'||paused)return;
 if(game.builtCount()<6){toast('Сначала построй все 6 стен на зелёных точках.');return;}
 game.player={x:game.shop.x+28,y:game.shop.y+15};game.cancelJob();destination=null;pendingWork=null;wallMenuOpen=false;keys.clear();
 $('shopModal').hidden=false;setMaterial(activeMaterial,false);updateUI();$('closeShop').focus({preventScroll:true});
}
function closeShop(){$('shopModal').hidden=true;updateUI();$('shopBeacon').focus({preventScroll:true});}
function walkToWall(id){const w=game.walls[id];destination={x:w.x,y:w.y+55};}
function installKit(){
 if(paused||game.state!=='playing')return;
 if(!game.inventory){toast('Сначала купи комплект в магазине.');return;}
 if(game.locked(selected)){toast('Стену атакуют. Дождись безопасного момента.');return;}
 if(dist(game.player,game.walls[selected])<=85){response(game.install(selected));}
 else{pendingWork={type:'install',id:selected};walkToWall(selected);toast('Инженер несёт комплект к стене '+(selected+1)+'.');}
}
function repairWall(){if(paused||game.state!=='playing')return;if(dist(game.player,game.walls[selected])<=85)response(game.repair(selected));else{pendingWork={type:'repair',id:selected};walkToWall(selected);toast('Инженер идёт к стене '+(selected+1)+'.');}}
function selectWall(id){
 selected=id;pendingWork=null;destination=null;
 if(!game.walls[id].built&&dist(game.player,game.walls[id])>75){wallMenuOpen=false;walkToWall(id);toast('Подойди к зелёной точке. Кнопка покупки появится рядом.');}
 else wallMenuOpen=true;updateUI();
}
for(let id=0;id<6;id++){const b=document.createElement('button');b.id='buildSite'+id;b.className='build-site';b.setAttribute('aria-label','Подойти к месту стены '+(id+1));b.innerHTML='<span>'+(id+1)+'</span><small>$20</small>';b.onclick=()=>{if(!paused)selectWall(id);};$('buildSites').append(b);}
function updateBuildSites(){
 const nearby=game.walls.find(w=>!w.built&&(!destination||w.id===selected)&&dist(game.player,w)<=75);
 if(started&&!paused&&nearby&&lastNearSite!==nearby.id){selected=nearby.id;wallMenuOpen=true;destination=null;pendingWork=null;}
 lastNearSite=nearby?.id??null;
 if(!game.walls[selected].built&&!nearby)wallMenuOpen=false;
 for(const w of game.walls){const b=$('buildSite'+w.id),p=worldPoint(w);b.hidden=w.built;b.disabled=paused;b.style.left=p.x+'px';b.style.top=p.y+'px';b.classList.toggle('nearby',nearby?.id===w.id);}
}
function togglePause(){if(game.state!=='playing'||!$('helpModal').hidden)return;paused=!paused;keys.clear();updateUI();}
function closeHelp(){$('helpModal').hidden=true;paused=helpWasPaused;updateUI();}
$('shopBeacon').onclick=openShop;$('closeShop').onclick=closeShop;
$('pause').onclick=togglePause;$('speed').onchange=e=>{speed=Number(e.target.value);if(speed>=2)speedTipDismissed=true;updateSpeedFtue();};
$('enableDoubleSpeed').onclick=()=>{speed=2;$('speed').value='2';speedTipDismissed=true;updateSpeedFtue();toast('Скорость игры ×2');};
$('dismissSpeedFtue').onclick=()=>{speedTipDismissed=true;updateSpeedFtue();};
function updateSpeedFtue(){const show=started&&game.builtCount()===6&&!speedTipDismissed&&speed===1&&!paused&&game.state==='playing'&&$('shopModal').hidden&&$('helpModal').hidden;$('speedFtue').hidden=!show;$('speed').classList.toggle('speed-highlight',show);}
$('restart').onclick=()=>{if(game.state!=='playing'||confirm('Начать заново? Текущий город будет сброшен.'))newGame();};$('again').onclick=newGame;
$('help').onclick=()=>{helpWasPaused=paused;paused=true;keys.clear();$('helpModal').hidden=false;updateUI();};$('closeHelp').onclick=closeHelp;
$('restartFtue').onclick=()=>{ftue=0;ftueTicks=0;ftueDoneUntil=0;try{localStorage.removeItem('buil-a-wall-ftue-v04');}catch{}closeHelp();};
$('skipFtue').onclick=()=>{finishFtue();ftueDoneUntil=0;updateFtue();};
$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>toast('Открой игру в отдельном окне браузера для полного экрана.'));};
$('popupClose').onclick=()=>{wallMenuOpen=false;updateUI();};
$('popupUpgrade').onclick=()=>{if(!paused){const empty=!game.walls[selected].built;const r=empty?game.construct(selected):game.upgrade(selected);if(r.ok){destination=null;pendingWork=null;keys.clear();}response(r);if(r.ok&&empty){wallMenuOpen=false;updateUI();}}};
$('popupRepair').onclick=repairWall;$('popupKit').onclick=installKit;
$('bagInstall').onclick=()=>{wallMenuOpen=true;toast('Нажми на нужную стену, затем «Установить комплект».');updateUI();};
$('refund').onclick=()=>response(game.refund());
function setShopTab(name){
 activeShopTab=name;
 for(const tab of ['walls','income']){const selected=tab===name;$(tab+'Panel').hidden=!selected;$(tab+'Tab').setAttribute('aria-selected',String(selected));$(tab+'Tab').tabIndex=selected?0:-1;}
 $('refund').hidden=name==='income';
}
for(const name of ['walls','income']){
 $(name+'Tab').onclick=()=>{setShopTab(name);updateUI();};
 $(name+'Tab').addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();const next=e.key==='Home'?'walls':e.key==='End'?'income':name==='walls'?'income':'walls';
  setShopTab(next);$(next+'Tab').focus({preventScroll:true});updateUI();
 });
}
$('buyDamageUpgrade').onclick=()=>{if(paused)return;const result=game.upgradeDamage();response(result);if(result.ok)setMaterial(activeMaterial,false);};
function updateDamageShop(){
 const bought=game.damageUpgraded,enough=game.money+1e-7>=DAMAGE_UPGRADE_PRICE;
 $('damageCurrentValue').textContent=number(game.cannonDamage(1));$('damageNextValue').textContent=number(LEVELS[1].damage*1.2);
 $('buyDamageUpgrade').disabled=bought||!enough||paused||game.state!=='playing'||game.builtCount()<6;
 $('buyDamageUpgrade').textContent=bought?'Куплено · урон пушек +20%':'Увеличить урон · '+cash(DAMAGE_UPGRADE_PRICE);
 $('damageUpgradeStatus').textContent=bought?'Все пушки наносят на 20% больше урона.':!enough?'Не хватает '+cash(Math.ceil(DAMAGE_UPGRADE_PRICE-game.money)):'Хватает долларов · усилит все пушки';
 $('damageUpgradeStatus').className=bought||enough?'enough':'short';
}
$('buyIncomeUpgrade').onclick=()=>{if(paused)return;const result=game.upgradeIncome();response(result);if(result.ok)setMaterial(activeMaterial,false);};
function updateIncomeShop(){
 const bought=game.incomeUpgraded,enough=game.money+1e-7>=INCOME_UPGRADE_PRICE;
 $('incomeCurrentRate').textContent=rateLabel(game.incomePerSecond());$('incomeNextRate').textContent=rateLabel(game.income());
 $('incomeCurrentInterval').textContent='Выплата раз в '+game.incomeInterval()+' сек.';
 $('buyIncomeUpgrade').disabled=bought||!enough||paused||game.state!=='playing'||game.builtCount()<6;
 $('buyIncomeUpgrade').textContent=bought?'Куплено · выплаты раз в секунду':'Улучшить доход · '+cash(INCOME_UPGRADE_PRICE);
 $('incomeUpgradeStatus').textContent=bought?'Все стены получают деньги раз в секунду до конца забега.':!enough?'Не хватает '+cash(Math.ceil(INCOME_UPGRADE_PRICE-game.money)):'Хватает долларов · удвоит доход всех целых стен';
 $('incomeUpgradeStatus').className=bought||enough?'enough':'short';
}

$('export').onclick=()=>{const blob=new Blob([JSON.stringify(game.export(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='buil-a-wall-run.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const MATERIALS=[null,{color:'#c59464',desc:'Простой и недорогой старт'},{color:'#c1ced9',desc:'Крепче стены, мощнее пушка'},{color:'#88bbdc',desc:'Стальная защита города'},{color:'#bb98ed',desc:'Усиленная осадная башня'},{color:'#f1cb63',desc:'Максимальная оборона'}];
function materialIcon(level){return spriteHTML('shop-material-'+['','wood','stone','steel','bastion','citadel'][level],'material-art');}
for(let l=1;l<=5;l++){
 const v=LEVELS[l],row=document.createElement('article');row.id='shopRow'+l;row.className='shop-row';row.style.setProperty('--material',MATERIALS[l].color);
 row.innerHTML=`<button class="material-thumb" id="selectMaterial${l}" aria-label="Посмотреть материал ${v.name}">${materialIcon(l)}</button><div class="material-copy"><strong>${v.name}</strong><small>Уровень ${l} · ${v.hp} HP</small><small id="materialIncome${l}">${payoutLabel(v.income)} · ${number(game.cannonDamage(l))} урон</small></div><div><button id="buy${l}" class="buy" aria-label="Купить ${v.name} за ${v.price} долларов">${cash(v.price)}</button><div class="buy-note" id="buyNote${l}"></div></div>`;
 $('shopItems').append(row);$('selectMaterial'+l).onclick=()=>setMaterial(l,false);
 $('buy'+l).onclick=()=>{if(paused)return;const result=game.buy(l);if(response(result)){closeShop();const desired=game.monsters.find(m=>!m.breached)?.target??game.forecast()[0]??0;selected=desired;wallMenuOpen=true;toast('Комплект куплен! Нажми «Установить комплект» над стеной.');updateUI();}};
}
function setMaterial(level,scroll=true){activeMaterial=Math.max(1,Math.min(5,Number(level)));const v=LEVELS[activeMaterial];$('materialSlider').value=String(activeMaterial);$('previewCard').style.setProperty('--material',MATERIALS[activeMaterial].color);$('previewBadge').textContent='УРОВЕНЬ '+activeMaterial;$('previewName').textContent=v.name;$('previewIcon').innerHTML=materialIcon(activeMaterial);$('slideCounter').textContent=activeMaterial+' / 5';$('previewStats').innerHTML=`${v.hp} HP · ${number(game.cannonDamage(activeMaterial))} урон/с<br><span style="color:#15964a">${payoutLabel(v.income)}</span>`;for(let l=1;l<=5;l++)$('shopRow'+l).classList.toggle('selected',l===activeMaterial);if(scroll)$('shopRow'+activeMaterial).scrollIntoView({behavior:'smooth',block:'nearest'});}
$('prevMaterial').onclick=()=>setMaterial(activeMaterial===1?5:activeMaterial-1);$('nextMaterial').onclick=()=>setMaterial(activeMaterial===5?1:activeMaterial+1);$('materialSlider').oninput=e=>setMaterial(e.target.value);
function updateFtue(){
 const n=game.builtCount();
 if(ftue<4)ftue=n===0?0:n===1&&ftueTicks<2?1:n<6?2:3;
 const steps=[['1 / 4 · ПЕРВАЯ СТЕНА','Подойди к зелёной точке','Нажми на точку — инженер подойдёт. Затем купи стену за $20.'],['2 / 4 · ДОХОД','Первая стена приносит $5 раз в 2 сек.','Деньги поднимаются над стеной. Через 8 секунд хватит на следующую.'],['3 / 4 · СТРОИТЕЛЬСТВО','Построй остальные стены · '+n+' / 6','Каждая стоит $20 и приносит $5 раз в 2 сек. Подходи к зелёным точкам.'],['4 / 4 · УЛУЧШЕНИЯ','Все стены готовы — усиливай защиту','Нажми стену для улучшения или зайди в магазин. Следи за титаном.'],['ГОТОВО','Теперь город под твоей защитой','Улучшай стены и ремонтируй повреждённые секции.']];
 const s=steps[ftue];$('ftue').hidden=ftue===4&&performance.now()>ftueDoneUntil;$('ftueStep').textContent=s[0];$('ftueTitle').textContent=s[1];$('ftueText').textContent=s[2];$('ftueProgress').style.width=(ftue===2?25+n/6*50:Math.min(100,(ftue+1)*25))+'%';$('shopBeacon').classList.toggle('tutorial-target',ftue===3);$('skipFtue').hidden=ftue===4;
}
function updateWallMenu(){
 const el=$('wallMenu');el.hidden=!wallMenuOpen||(game.job?.type==='repair'&&game.job.id===selected)||game.state!=='playing'||!$('helpModal').hidden||!$('shopModal').hidden;
 const w=game.walls[selected];
 const requirement=w.built?game.replacementIssue(selected):'';
 $('popupRequirement').hidden=!requirement;$('popupRequirement').textContent=requirement;
 if(!w.built){
  $('popupTitle').textContent='Место для стены '+(selected+1);$('popupCurrent').textContent='Дерево · 180 HP · пушка';$('popupNext').textContent='После покупки: '+payoutLabel(5);
  const enough=game.money+1e-7>=20;$('popupResources').className=enough?'enough':'short';$('popupResources').textContent=enough?'✓ Хватает долларов':'Не хватает '+cash(Math.ceil(20-game.money));
  $('popupUpgrade').textContent='Купить стену · $20';$('popupUpgrade').disabled=paused||!enough||dist(game.player,w)>75;$('popupKit').hidden=true;$('popupRepair').hidden=true;positionWallMenu();return;
 }
 $('popupRepair').hidden=false;
 const v=LEVELS[w.level],level=w.hp<=0?w.level:w.level+1,next=LEVELS[level],locked=game.locked(selected),working=game.job?.id===selected;
 $('popupTitle').textContent=`Стена ${selected+1} · ${v.name}`;$('popupCurrent').textContent=`${Math.ceil(w.hp)} / ${v.hp} HP · ${number(game.cannonDamage(w.level))} урон · ${payoutLabel(v.income)}`;
 $('popupNext').textContent=next?`${w.hp<=0?'Восстановить':'Следующий уровень: '+next.name} · ${next.hp} HP`:'Максимальный уровень';
 const enough=next&&game.money+1e-7>=next.price;$('popupResources').className=enough?'enough':'short';$('popupResources').textContent=next?(enough?'✓ Хватает долларов · '+cash(next.price):'Не хватает '+cash(Math.ceil(next.price-game.money))):'Все улучшения установлены';
 $('popupUpgrade').textContent=locked?'Под атакой — улучшение закрыто':next?`${w.hp<=0?'Восстановить':'Улучшить'} · ${cash(next.price)}`:'Максимальный уровень';$('popupUpgrade').disabled=paused||!!requirement||!next||!enough||locked||working||game.builtCount()<6;if(game.builtCount()<6){$('popupUpgrade').textContent='Сначала построй все 6 стен';$('popupResources').textContent='Построено '+game.builtCount()+' / 6';}
 if(game.job){$('popupUpgrade').disabled=true;if(working&&game.job.type==='upgrade'){$('popupUpgrade').textContent='Установка: '+Math.max(0,game.job.duration-game.job.t).toFixed(1)+' с';$('popupResources').textContent='Оплачено '+cash(game.job.cost)+' · устанавливается';}}
 $('popupKit').hidden=!game.inventory;$('popupKit').textContent=game.job?.type==='install'&&working?'Установка: '+Math.max(0,game.job.duration-game.job.t).toFixed(1)+' с':`Установить комплект · ${game.inventory?LEVELS[game.inventory].name:''}`;$('popupKit').disabled=paused||!!game.replacementIssue(selected,game.inventory)||!game.inventory||locked||!!game.job||game.inventory<w.level;
 $('popupRepair').textContent=game.job?.type==='repair'&&working?`Ремонт: ${Math.round(game.job.t/4*100)}%`:'Подойти и починить · $0,15 / HP';$('popupRepair').disabled=paused||w.hp<=0||w.hp>=v.hp||game.money<1||!!game.job;
 positionWallMenu();
}
function positionWallMenu(){const el=$('wallMenu');if(el.hidden)return;const p=worldPoint(game.walls[selected]);const width=330,height=el.offsetHeight||270,left=Math.max(14,Math.min(cw-width-14,p.x-width/2));el.style.left=left+'px';el.style.top=Math.max(15,p.y-height-30)+'px';el.style.setProperty('--arrow-x',Math.max(22,Math.min(width-22,p.x-left))+'px');}
function updateUI(){
 updateBuildSites();
 $('money').textContent=cash(game.money);$('income').textContent=payoutLabel(game.income())+' со стен';$('shopMoney').textContent=cash(game.money);
 $('timer').textContent=game.phase==='build'?game.builtCount()+' / 6':game.phase==='battle'?game.monsters.length+' в бою':clock(Math.ceil(game.nextWave-game.time));$('waveLabel').textContent=game.phase==='build'?'ПОСТРОЙ ЗАЩИТУ':game.phase==='battle'?'АТАКА ТИТАНОВ':game.wave===0?'ПЕРВЫЙ ТИТАН ЧЕРЕЗ':'ДО СЛЕД. УРОВНЯ';$('waveStatus').textContent=game.phase==='build'?'ТИТАНЫ ПОСЛЕ ПОСТРОЙКИ':`УРОВЕНЬ ${game.phase==='prep'?game.wave+1:game.wave} / ${MAX_WAVES}`;
 $('shopBeacon').disabled=game.builtCount()<6;$('shopBeacon').querySelector('small').textContent=game.builtCount()<6?'Откроется после 6 стен':'Нажми — окажешься рядом ↗';
 $('cityHp').textContent=Math.ceil(game.core);$('coreBar').style.width=game.core/12+'%';
 $('objective').textContent=game.phase==='prep'?'СЛЕДУЮЩАЯ ЦЕЛЬ: '+game.forecast().map(i=>'СТЕНА '+(i+1)).join(' + '):'ТИТАНЫ ИДУТ К ПОДСВЕЧЕННЫМ СТЕНАМ';
 $('bagTitle').textContent=game.inventory?LEVELS[game.inventory].name+' · уровень '+game.inventory:'Рюкзак пуст';$('bagText').textContent=game.inventory?'Выбери стену для установки':'1 место для комплекта';$('bagInstall').hidden=!game.inventory;
 if($('pause').dataset.paused!==String(paused)){$('pause').innerHTML=spriteHTML(paused?'button-play':'button-pause');$('pause').dataset.paused=String(paused);}$('pause').setAttribute('aria-label',paused?'Продолжить игру':'Пауза');$('pausedLabel').hidden=!paused||!$('helpModal').hidden||game.state!=='playing';
 $('shopHint').textContent=activeShopTab==='income'?'Улучшения действуют на все стены и пушки до конца забега.':game.inventory?'В рюкзаке: '+LEVELS[game.inventory].name+'. Установи комплект или верни его.':'Один комплект в рюкзаке. После покупки нажми на стену.';$('refund').disabled=paused||!game.inventory;
 for(let l=1;l<=5;l++){$('materialIncome'+l).textContent=payoutLabel(LEVELS[l].income)+' · '+number(game.cannonDamage(l))+' урон';const enough=game.money+1e-7>=LEVELS[l].price;$('buy'+l).disabled=game.builtCount()<6||paused||!!game.inventory||!enough||game.state!=='playing';$('buyNote'+l).textContent=game.inventory?'Рюкзак занят':enough?'КУПИТЬ КОМПЛЕКТ':'Не хватает '+cash(Math.ceil(LEVELS[l].price-game.money));$('buyNote'+l).className='buy-note'+(!enough?' missing':'');}
 updateIncomeShop();updateDamageShop();updateWallMenu();updateFtue();updateSpeedFtue();
 if(game.state!=='playing'&&!endShown){endShown=true;for(const id of ['shopModal','helpModal'])$(id).hidden=true;$('endModal').hidden=false;$('endBadge').innerHTML=spriteHTML(game.state==='won'?'badge-victory':'badge-defeat');$('endTitle').textContent=game.state==='won'?'Город выстоял!':'Рубеж прорван';$('endText').textContent=game.state==='won'?`Все ${MAX_WAVES} уровней пройдены.`:'Усиль цель титана заранее и ремонтируй стену во время атаки.';$('endStats').innerHTML=[[clock(game.time),'Время'],[game.stats.kills,'Титанов'],[game.stats.installs,'Улучшений'],[cash(game.stats.spent),'Потрачено']].map(([n,s])=>`<div><b>${n}</b><span>${s}</span></div>`).join('');}
}
document.addEventListener('keydown',e=>{
 if(!started)return;
 if(['INPUT','SELECT'].includes(e.target.tagName))return;
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.repeat)return;
 if(e.code==='Escape'){if(!$('helpModal').hidden)closeHelp();else if(!$('shopModal').hidden)closeShop();else if(wallMenuOpen){wallMenuOpen=false;updateUI();}else togglePause();return;}
 if(e.code==='KeyP'||e.code==='Space'){togglePause();return;}
 if(paused||game.state!=='playing'||!$('shopModal').hidden||!$('helpModal').hidden)return;
 if(/^Digit[1-6]$/.test(e.code))selectWall(Number(e.code.slice(-1))-1);else if(e.code==='KeyE')openShop();else if(e.code==='KeyF')installKit();else if(e.code==='KeyR')repairWall();else{keys.add(e.code);destination=null;pendingWork=null;}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();if(started&&game.state==='playing'){paused=true;updateUI();}});document.addEventListener('visibilitychange',()=>{if(started&&document.hidden){paused=true;keys.clear();updateUI();}});
canvas.addEventListener('pointerdown',e=>{
 if(paused||game.state!=='playing')return;
 const b=canvas.getBoundingClientRect(),s={x:(e.clientX-b.left)*cw/b.width,y:(e.clientY-b.top)*ch/b.height},p=worldFromScreen(s);
 const chest=game.chests.find(c=>{const cp=worldPoint(c);return Math.abs(s.x-cp.x)<48&&s.y>cp.y-85&&s.y<cp.y+32;});if(chest){wallMenuOpen=false;pendingWork=null;destination={x:chest.x,y:chest.y};updateUI();return;}
 const w=game.walls.find(w=>Math.abs(w.x-p.x)<49&&s.y>worldPoint(w).y-145&&s.y<worldPoint(w).y+55);if(w){selectWall(w.id);return;}
 const sp=worldPoint(game.shop);if(Math.hypot(s.x-sp.x,s.y-sp.y)<105){openShop();return;}
 wallMenuOpen=false;pendingWork=null;destination={x:Math.max(FIELD_BOUNDS.left,Math.min(FIELD_BOUNDS.right,p.x)),y:Math.max(FIELD_BOUNDS.top,Math.min(FIELD_BOUNDS.bottom,p.y))};updateUI();
});
