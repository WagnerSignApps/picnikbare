import { execSync } from 'child_process';

console.log('Setting NODE_OPTIONS...');
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

console.log('Running TypeScript compiler...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('TypeScript compilation completed successfully');
} catch (error) {
  console.error('TypeScript compilation failed');
  process.exit(1);
}

console.log('Running Vite build...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('Vite build completed successfully');
} catch (error) {
  console.error('Vite build failed');
  process.exit(1);
}
