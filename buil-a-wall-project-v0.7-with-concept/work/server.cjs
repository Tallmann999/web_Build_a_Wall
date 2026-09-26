const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../outputs');
http.createServer((req,res)=>{const file=path.join(dir,'last-bastion.html');if(req.url==='/'||req.url==='/last-bastion.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}else{res.writeHead(404);res.end('Not found');}}).listen(8765,'127.0.0.1',()=>console.log('Prototype at http://127.0.0.1:8765'));
