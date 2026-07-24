const fs = require('fs');

const appFile = 'd:/candy-club-system/app.js';
let app = fs.readFileSync(appFile, 'utf8');

app = app.replace(
    'let match = p.trim().match(/(.*?)\\s+\\((\\d+)\\)/);',
    'let match = p.trim().match(/(.*?)\\s+\\((\\d+)\\)(?:\\s*\\[باركود:\\s*(.*?)\\])?/);'
);

// If there are multiple occurrences of that line:
while (app.includes('let match = p.trim().match(/(.*?)\\s+\\((\\d+)\\)/);')) {
    app = app.replace(
        'let match = p.trim().match(/(.*?)\\s+\\((\\d+)\\)/);',
        'let match = p.trim().match(/(.*?)\\s+\\((\\d+)\\)(?:\\s*\\[باركود:\\s*(.*?)\\])?/);'
    );
}

fs.writeFileSync(appFile, app, 'utf8');
console.log('Regex update fixed');
