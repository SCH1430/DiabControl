const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
for (const name of fs.readdirSync(path.join(root, 'src')).filter((name) => name.endsWith('.js'))) {
  new vm.Script(fs.readFileSync(path.join(root, 'src', name), 'utf8'), { filename: name });
}
const source = execFileSync(
  process.env.PYTHON || 'python3',
  ['-B', '-c', 'import scripts.build as build; print(build.javascript())'],
  { cwd: root, encoding: 'utf8' },
);
new vm.Script(source, { filename: 'assembled-app.js' });
console.log('All source modules and the assembled application parse successfully.');
