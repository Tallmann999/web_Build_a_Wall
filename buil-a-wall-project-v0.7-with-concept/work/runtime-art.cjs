const fs=require('node:fs'),path=require('node:path');
// Reuse the already sliced treasure sprite without loading a reserve atlas.
module.exports=function runtimeArt(source){
 const art={...source,atlases:[],frames:{}};const pages=new Map();
 source.atlases.forEach((a,i)=>{if(a.runtime){pages.set(i,art.atlases.length);art.atlases.push({...a});}});
 for(const [name,f] of Object.entries(source.frames))if(f.runtime)art.frames[name]={...f,page:pages.get(f.page)};
 for(const name of ['chest','hammer']){
  if(art.frames[name])continue;const f=source.frames[name],file=`sprites/${name}.webp`;
  art.frames[name]={...f,page:art.atlases.length,x:0,y:0,runtime:true};
  art.atlases.push({file,width:f.w,height:f.h,bytes:fs.statSync(path.join(__dirname,'assets',file)).size,runtime:true});
 }
 return art;
};
