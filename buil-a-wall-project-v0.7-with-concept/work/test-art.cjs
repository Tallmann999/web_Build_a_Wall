const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const art=require('./runtime-art.cjs')(JSON.parse(fs.readFileSync('work/assets/atlas.json','utf8')));
const ctx=new Proxy({measureText:t=>({width:t.length*9}),createLinearGradient:()=>({addColorStop(){}}),drawImage:(im,...n)=>{assert(im);assert(n.every(Number.isFinite),'Non-finite sprite coordinates');}}, {get:(obj,key)=>key in obj?obj[key]:(()=>{})});
const element=()=>({style:{setProperty(){}},dataset:{},classList:{add(){},remove(){},toggle(){}},append(){},setAttribute(){},addEventListener(){},scrollIntoView(){},querySelector(){return element()},querySelectorAll(){return[]},focus(){},getContext:()=>ctx,offsetHeight:270,hidden:true});
const elements=new Map();
const document={getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:()=>element(),querySelectorAll:()=>[],documentElement:element(),addEventListener(){}};
const sandbox={document,Image:class{decode(){return Promise.resolve()}},innerWidth:1920,innerHeight:1080,performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},localStorage:{setItem(){},removeItem(){}},console};
sandbox.window=sandbox;sandbox.addEventListener=()=>{};
const context=vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('work/engine.js','utf8'),context);
vm.runInContext(fs.readFileSync('work/client.js','utf8').replace('/* ATLAS_DATA */',JSON.stringify(art)),context);
vm.runInContext(`
artReady=true;started=true;
const originalDrawSprite=drawSprite;
drawSprite=(name,...args)=>{if(!ART.frames[name])throw Error('Missing '+name);originalDrawSprite(name,...args)};
for(let level=1;level<=5;level++){
 game=new Game({prebuilt:true,startingMoney:100000});
 game.walls.forEach((w,i)=>{w.level=level;w.hp=i%3===0?0:i%3===1?LEVELS[level].hp*.3:LEVELS[level].hp});
 game.wave=level;game.spawn();game.monsters.forEach(m=>m.level=level+1);
 game.inventory=level;draw(1/60);updateUI();
 game.inventory=null;game.job={id:0,type:'repair',t:1,duration:4};draw(1/60);
 game.job={id:0,type:'upgrade',t:1,duration:2};draw(1/60);
 game.job=null;destination={x:-250,y:200};draw(1/60);
}
for(let level=1;level<=MAX_WAVES;level++){game.monsters.forEach(m=>m.level=level);game.bullets=[{x:0,y:0}];game.effects=['build','hit','death'].map(type=>({x:0,y:100,t:.5,type}));draw(1/60);}
for(const state of ['won','lost']){game.state=state;endShown=false;updateUI();}
newGame();draw(1/60);
game=new Game({prebuilt:true,startingMoney:5000});game.player={...game.shop};
setShopTab('income');updateUI();
if($('incomePanel').hidden||!$('wallsPanel').hidden||$('buyIncomeUpgrade').disabled)throw Error('Income tab unavailable');
$('buyIncomeUpgrade').onclick();
if(!game.incomeUpgraded||game.money!==0||!$('buyIncomeUpgrade').disabled||!$('income').textContent.includes('/ 1 сек'))throw Error('Upgrade UI not synchronized');
$('buyIncomeUpgrade').onclick();if(game.money!==0)throw Error('Repeated purchase charged again');
for(let i=0;i<120;i++)game.step(1/60);collectIncome();
if(incomeLabels.length!==6||!$('cashGain').textContent)throw Error('Income feedback missing');
paused=false;drawCash(.4);drawCash(.6);if(incomeLabels.length)throw Error('Income float did not disappear');
newGame();updateUI();if(game.incomeUpgraded||activeShopTab!=='walls')throw Error('New run did not reset economy');
game=new Game({prebuilt:true,startingMoney:5000});game.player={...game.shop};
setShopTab('income');updateUI();
if($('incomePanel').hidden||$('buyDamageUpgrade').disabled)throw Error('Damage upgrade unavailable');
$('buyDamageUpgrade').onclick();
if(!game.damageUpgraded||game.money!==0||!$('buyDamageUpgrade').disabled||$('damageCurrentValue').textContent!=='7,2')throw Error('Damage upgrade UI out of sync');
selected=0;updateWallMenu();if(!$('popupCurrent').textContent.includes('7,2 урон'))throw Error('Wall menu damage not updated');
if(!$('materialIncome2').textContent.includes('22,8 урон'))throw Error('Material damage not updated');
if(townObjects.some(o=>['house-red','house-blue','forge','warehouse','bakery'].includes(o.name)))throw Error('Extra buildings remain');
newGame();updateUI();if(game.damageUpgraded||speed!==1||!$('speedFtue').hidden)throw Error('Fresh run state wrong');
game.money=200;
for(let i=0;i<6;i++){game.player={x:game.walls[i].x,y:175};game.construct(i);updateUI();if($('speedFtue').hidden!==(i<5))throw Error('Speed hint must unlock on sixth construction');}
openShop();if(!$('speedFtue').hidden)throw Error('Speed hint shows through shop');closeShop();
$('enableDoubleSpeed').onclick();if(speed!==2||!$('speedFtue').hidden)throw Error('Double speed FTUE failed');
$('speed').onchange({target:{value:'1'}});if(!$('speedFtue').hidden)throw Error('Completed hint repeated');
newGame();game=new Game({prebuilt:true});updateUI();$('dismissSpeedFtue').onclick();if(!$('speedFtue').hidden||speed!==1)throw Error('Dismiss changed speed');
game.spawn();game.monsters[0].breached=true;draw(1/60);
game=new Game({prebuilt:true});game.wave=6;game.phase='prep';game.nextWave=game.time+10;updateUI();if(!$('waveStatus').textContent.includes('7 / 12'))throw Error('Wave seven counter incorrect');
game.wave=11;game.spawn();updateUI();draw(1/60);if(game.monsters.length!==5||!$('waveStatus').textContent.includes('12 / 12'))throw Error('Final wave UI incorrect');
game.monsters.forEach(m=>m.hp=0);game.step(1/60);endShown=false;updateUI();if(!$('endText').textContent.includes('12'))throw Error('Victory copy is outdated');
game=new Game({prebuilt:true});game.spawnChest();draw(1/60);const chest=game.chests[0];game.player={x:chest.x,y:chest.y};game.step(1/60);collectIncome();if(!incomeLabels.some(f=>String(f.id).startsWith('chest-')))throw Error('Chest collection feedback missing');
if(worldPoint(game.walls[0]).y!==740)throw Error('Wall baseline must match the lowered layout');
game=new Game({prebuilt:true});game.spawn();const emerging=game.monsters[0],groundY=worldFromScreen({x:0,y:FIELD_LAYOUT.horizon}).y;
for(const progress of [0,.25,.5,.75,1]){emerging.y=emerging.spawnY+(groundY-emerging.spawnY)*progress;const a=titanAppearance(emerging);if(Math.abs(a.emerge-progress)>1e-6)throw Error('Horizon emergence progress mismatch');if(progress<1&&Math.abs((FIELD_LAYOUT.horizon-(a.y-a.height))/a.height-(.22+.78*progress))>1e-6)throw Error('Titan is not progressively revealed from the head');draw(0);}
const full=titanAppearance(emerging);emerging.y+=.001;if(Math.abs(titanAppearance(emerging).y-full.y)>.01)throw Error('Titan jumps when stepping onto the ground');
game.walls[0].hp=1;game.player={...game.walls[0]};game.money=1000;game.repair(0);selected=0;wallMenuOpen=true;updateWallMenu();if(!$('wallMenu').hidden)throw Error('Wall menu covers repair timer');for(const t of [0,.2,.4,1.2,3.99]){game.job.t=t;draw(0);}game.cancelJob();draw(0);
game=new Game({prebuilt:true,startingMoney:10000});selected=0;paused=false;wallMenuOpen=true;game.inventory=2;updateUI();
if($('popupRequirement').hidden||$('popupRequirement').textContent!=='Игрок должен быть рядом'||!$('popupUpgrade').disabled||!$('popupKit').disabled)throw Error('Missing red proximity requirement');
game.player={x:game.walls[0].x,y:175};updateUI();if(!$('popupRequirement').hidden||$('popupUpgrade').disabled||$('popupKit').disabled)throw Error('Nearby healthy wall should unlock');
game.walls[0].hp=179;updateUI();if($('popupRequirement').hidden||!$('popupRequirement').textContent.includes('полностью')||!$('popupUpgrade').disabled||!$('popupKit').disabled)throw Error('Damaged wall bypasses repair');
game.repair(0);game.step(.1);updateUI();if(!$('popupRequirement').hidden||$('popupUpgrade').disabled)throw Error('Completed repair did not unlock replacement');
game=new Game({prebuilt:true,firstWave:1000});game.walls.forEach(w=>w.hp=0);game.spawnChest();game.nextChest=null;const timedChest=game.chests[0].id;
paused=true;lastFrame=0;speed=2;accumulator=0;for(let i=1;i<=100;i++)frame(i*50);if(!game.chests.some(c=>c.id===timedChest)||game.time!==0)throw Error('Pause advances chest lifetime');
paused=false;for(let i=101;i<=198;i++)frame(i*50);if(!game.chests.some(c=>c.id===timedChest))throw Error('Chest expires before 5 real seconds at x2');
frame(9950);frame(10000);if(game.chests.some(c=>c.id===timedChest)||Math.abs(game.time-10)>1e-6)throw Error('Chest must disappear at exactly 5 real seconds at x2');
for(const p of [{x:0,y:-170},{x:100,y:120},{x:-150,y:330}]){const q=worldFromScreen(worldPoint(p));if(Math.hypot(p.x-q.x,p.y-q.y)>1e-6)throw Error('Field click projection mismatch');}

`,context);
console.log('Renderer: all 5 wall levels × 3 damage states, 12 titan levels, builder poses, jobs, scenery and both end dialogs resolve valid atlas frames.');
console.log(JSON.stringify({runtimeSprites:Object.keys(art.frames).length,runtimeAtlases:art.atlases.length,bytes:art.atlases.reduce((sum,a)=>sum+a.bytes,0)}));

