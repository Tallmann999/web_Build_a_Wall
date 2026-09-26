const fs=require('node:fs'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,n),'utf8');
let html=read('shell.html').replace('/* STYLE */',()=>read('style.css')).replace('/* ENGINE */',()=>read('engine.js')).replace('/* CLIENT */',()=>read('client.js')).replace('/* START_IMAGE */',()=> 'data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'assets/start-scene.png')).toString('base64'));
fs.mkdirSync(path.join(__dirname,'../outputs'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../outputs/last-bastion.html'),html);
console.log('Built standalone prototype: '+Buffer.byteLength(html)+' bytes');
