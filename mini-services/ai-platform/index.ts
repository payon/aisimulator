import { spawn } from 'child_process';

const server = spawn('bun', ['.next/standalone/server.js'], {
  cwd: '/home/z/my-project',
  env: { ...process.env, PORT: '3000', NODE_OPTIONS: '--max-old-space-size=2048' },
  stdio: 'inherit',
});

server.on('exit', () => {
  console.log('Server exited, restarting in 1s...');
  setTimeout(() => {
    process.exit(1); // Let process manager restart
  }, 1000);
});

process.on('SIGTERM', () => {
  server.kill();
  process.exit(0);
});
