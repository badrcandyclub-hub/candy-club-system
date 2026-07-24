const fs = require('fs'); 
const app = fs.readFileSync('d:/candy-club-system/app.js', 'utf8'); 
const lines = app.split('\n'); 
let matchLines = [];
lines.forEach((line, i) => { 
    if(line.includes('\u062a\u0639\u062f\u064a\u0644') || line.includes('edit')) { 
        matchLines.push('Line ' + (i+1) + ': ' + line.trim()); 
    } 
});
fs.writeFileSync('d:/candy-club-system/matches.txt', matchLines.join('\n'));
