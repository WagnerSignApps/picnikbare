import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting build process with increased memory limit...');

try {
  console.log('Running TypeScript compiler...');
  execSync('npx tsc', { 
    stdio: 'inherit',
    cwd: __dirname,
    env: { 
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096'
    } 
  });

  console.log('Running Vite build...');
  execSync('npx vite build', { 
    stdio: 'inherit',
    cwd: __dirname,
    env: { 
      ...process.env, 
      NODE_OPTIONS: '--max-old-space-size=4096',
      UV_THREADPOOL_SIZE: '4',
      NODE_ENV: 'production'
    } 
  });

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
