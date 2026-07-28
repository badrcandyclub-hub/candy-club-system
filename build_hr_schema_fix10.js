const fs = require('fs');
let code = fs.readFileSync('Code.txt', 'utf8');
code = code.replace(/\\\\n/g, '\\n');
fs.writeFileSync('Code.txt', code, 'utf8');
console.log('Fixed literal newlines');
