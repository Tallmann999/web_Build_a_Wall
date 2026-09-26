// Generated data is embedded by build.cjs; only compressed atlases ship to the browser.
const ART = /* ATLAS_DATA */;
const atlasImages = ART.atlases.map(a => {const image=new Image();image.src=a.url;return image;});
let artReady=false;
function spriteStyle(name){
 const f=ART.frames[name];if(!f)throw new Error('Unknown sprite: '+name);
 const a=ART.atlases[f.page];
 return `background-image:var(--atlas-${f.page});background-size:${a.width/f.w*100}% ${a.height/f.h*100}%;background-position:${f.x/(a.width-f.w)*100}% ${f.y/(a.height-f.h)*100}%;aspect-ratio:${f.w}/${f.h}`;
}
function spriteHTML(name,cls=''){return `<span class="art-sprite ${cls}" aria-hidden="true" style="${spriteStyle(name)}"></span>`;}
function hydrateSprites(root=document){root.querySelectorAll('[data-sprite]').forEach(el=>{el.classList.add('art-sprite');el.style.cssText+=';'+spriteStyle(el.dataset.sprite);});}
function drawSprite(name,x,y,width,height){
 if(!artReady)return;const f=ART.frames[name];if(!f)throw new Error('Unknown sprite: '+name);
 height=height??width*f.h/f.w;
 ctx.drawImage(atlasImages[f.page],f.x,f.y,f.w,f.h,x,y,width,height);
}
function spriteAt(name,x,baseline,width){const f=ART.frames[name];drawSprite(name,x-width/2,baseline-width*f.h/f.w,width);}
ART.atlases.forEach((a,i)=>document.documentElement.style.setProperty('--atlas-'+i,`url("${a.url}")`));
hydrateSprites();
const assetsReady=Promise.all(atlasImages.map(im=>im.decode())).then(()=>{artReady=true;});
