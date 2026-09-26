const fs=require('node:fs'),path=require('node:path');
fs.writeFileSync(path.join(__dirname,'client.js'),['ui-v04.js','sprites.js','render-v04.js'].map(n=>fs.readFileSync(path.join(__dirname,n),'utf8')).join('\n'));
