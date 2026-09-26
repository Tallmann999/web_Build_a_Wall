const fs=require('node:fs');
const vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('outputs/last-bastion.html','utf8');
for(const id of ['wallMenu','popupRequirement','popupUpgrade','popupResources','cityHp','wallet','ftue','shopBeacon','materialSlider','previewIcon','startScreen','startPlaying','playSurface','wallsTab','incomeTab','incomePanel','buyIncomeUpgrade'])if(!html.includes('id="'+id+'"'))throw Error('Missing '+id);
if(['/* ENGINE */','/* CLIENT */','/* STYLE */','/* START_IMAGE */','/* ATLAS_DATA */','/* ART_STYLES */'].some(s=>html.includes(s)))throw Error('Unbuilt template');
if(html.includes('id="intro"')||html.includes('ПОСЛЕДНИЙ РУБЕЖ'))throw Error('Obsolete splash or heading');
if(!html.includes('width="1920" height="1080"'))throw Error('Wrong design resolution');
console.log('Standalone UI elements and embedded source verified.');
for(const id of ['speedFtue','enableDoubleSpeed','dismissSpeedFtue','buyDamageUpgrade'])assert(html.includes('id="'+id+'"'),`Missing ${id}`);
assert(html.includes('tabindex="-1">Улучшения</button>'),'Missing renamed upgrades tab');
for(const [,script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script);
const art=JSON.parse(fs.readFileSync('work/assets/atlas.json','utf8'));
const runtime=require('./runtime-art.cjs')(art);
const recipes=JSON.parse(fs.readFileSync('work/assets/slice-recipes.json','utf8'));
assert.equal(new Set(recipes.sprites.map(s=>s.sheet)).size,11,'Every supplied sheet must be sliced');
for(const [name,f] of Object.entries(art.frames)){
 const a=art.atlases[f.page];assert(a,`${name}: missing page`);
 assert(f.x>=0&&f.y>=0&&f.x+f.w<=a.width&&f.y+f.h<=a.height,`${name}: crop outside atlas`);
 assert(fs.existsSync(`work/assets/sprites/${name}.webp`),`${name}: missing individual sprite`);
}
for(let l=1;l<=5;l++)for(const state of ['wall','damaged','rubble','cannon'])assert(art.frames[`${state}-${l}`].runtime);
for(const [,name] of html.matchAll(/data-sprite="([^"]+)"/g))assert(runtime.frames[name]?.runtime,`Unbundled DOM sprite: ${name}`);
// Catch misspelled or omitted static renderer/UI references, including reserve-only art.
for(const source of ['work/render-v04.js','work/ui-v04.js']){
 const code=fs.readFileSync(source,'utf8');
 for(const [,name] of code.matchAll(/(?:drawSprite|spriteAt|spriteHTML)\('([a-z0-9-]+)'(?=,|\))/g))assert(runtime.frames[name]?.runtime,`Unbundled runtime sprite: ${name}`);
}
assert(art.atlases.filter(a=>a.runtime).reduce((n,a)=>n+a.bytes,0)<2*1024*1024,'Runtime atlas budget exceeded');
const originalCover=fs.readFileSync('work/assets/start-scene.png').toString('base64');
assert(Buffer.byteLength(html)<2500000+originalCover.length,'Standalone HTML budget exceeded');
assert(html.includes('data:image/png;base64,'+originalCover),'Original cover was not preserved');
assert.equal((html.match(/data:image\/png/g)||[]).length,1,'Only the original cover PNG may ship in HTML');
console.log(`${Object.keys(art.frames).length} crops, 11 source sheets, 20 wall states, runtime atlas bounds and size budget verified.`);
