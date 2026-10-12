const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function run(command, args, env = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run(process.env.PYTHON || 'python3', ['scripts/build.py', '--check']);
run(process.execPath, ['scripts/check.cjs']);
run(process.execPath, ['--test', 'tests/core.test.cjs', 'tests/emergency-correction.test.cjs']);
for (const file of ['start-guide', 'diabcontrol', 'content', 'explore', 'reliability', 'pwa', 'home', 'emergency', 'guide-interaction', 'medical-art', 'learning', 'entry-launcher'])
  run(process.execPath, [`tests/${file}.e2e.cjs`], { TEST_BROWSER: 'chromium' });
const browsers = process.argv.includes('--matrix') ? ['chromium', 'webkit', 'firefox'] : ['chromium'];
for (const browser of browsers) run(process.execPath, ['tests/browser.e2e.cjs'], { TEST_BROWSER: browser });
console.log('All requested checks passed. Disposable output is outside the project.');
