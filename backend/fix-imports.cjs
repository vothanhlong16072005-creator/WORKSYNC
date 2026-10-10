const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/from\s+['\"](\.[^'\"]+)['\"]/g, (match, p1) => {
    if (!p1.endsWith('.js') && !p1.endsWith('.ts')) return `from '${p1}.js'`;
    return match;
  });
  fs.writeFileSync(file, content, 'utf8');
});
console.log('Imports fixed');
