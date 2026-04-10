#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');

function run(cmd) {
  try {
    const output = execSync(cmd, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 90000,
    });
    return { output: output.trim(), code: 0 };
  } catch (err) {
    const out = ((err.stdout || '') + '\n' + (err.stderr || '')).trim();
    return { output: out, code: err.status || 1 };
  }
}

const lint = run('npm run lint');
const build = lint.code === 0
  ? run('npm run build')
  : { output: '(skipped — corrija o lint primeiro)', code: 1 };

if (lint.code !== 0 || build.code !== 0) {
  const lines = [
    'LINT/BUILD com problemas. Corrija sem eslint-disable, @ts-ignore ou suprimir regras:',
    '',
    `── LINT (exit ${lint.code}) ──`,
    lint.output || '(sem saída)',
    '',
    `── BUILD (exit ${build.code}) ──`,
    build.output || '(sem saída)',
  ];

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: lines.join('\n'),
    },
  }));
}
