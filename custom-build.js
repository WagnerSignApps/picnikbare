const { execSync } = require('child_process');

console.log('Starting build process with increased memory limit...');

try {
  // Run TypeScript compiler
  console.log('Running TypeScript compiler...');
  execSync('npx tsc', { stdio: 'inherit' });

  // Run Vite build with increased memory
  console.log('Running Vite build...');
  execSync('npx vite build', { 
    stdio: 'inherit',
    cwd: __dirname,
    env: { 
      ...process.env, 
      NODE_OPTIONS: '--max-old-space-size=4096',
      UV_THREADPOOL_SIZE: '4',
      // Force production mode
      NODE_ENV: 'production',
      // Disable sourcemaps to reduce memory usage
      VITE_SKIP_SOURCEMAP: 'true'
    } 
  });

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
