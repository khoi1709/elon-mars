import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['--test', 'tests/mission-v2/activity-rules.test.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
