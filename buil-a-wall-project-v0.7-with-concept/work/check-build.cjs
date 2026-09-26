const fs=require('node:fs');
const html=fs.readFileSync('outputs/last-bastion.html','utf8');
for(const id of ['wallMenu','popupUpgrade','popupResources','cityHp','wallet','ftue','shopBeacon','materialSlider','previewIcon','startScreen','startPlaying','playSurface'])if(!html.includes('id="'+id+'"'))throw Error('Missing '+id);
if(['/* ENGINE */','/* CLIENT */','/* STYLE */','/* START_IMAGE */'].some(s=>html.includes(s)))throw Error('Unbuilt template');
if(html.includes('id="intro"')||html.includes('ПОСЛЕДНИЙ РУБЕЖ'))throw Error('Obsolete splash or heading');
if(!html.includes('width="1920" height="1080"'))throw Error('Wrong design resolution');
console.log('Standalone UI elements and embedded source verified.');
