# Set environment variables for the build
$env:NODE_OPTIONS = "--max-old-space-size=4096"
$env:UV_THREADPOOL_SIZE = "4"
$env:NODE_ENV = "production"

# Run TypeScript compiler
Write-Host "Running TypeScript compiler..."
tsc

# Check if TypeScript compilation was successful
if ($LASTEXITCODE -ne 0) {
    Write-Error "TypeScript compilation failed"
    exit $LASTEXITCODE
}

# Run Vite build
Write-Host "Running Vite build..."
vite build

# Check if Vite build was successful
if ($LASTEXITCODE -ne 0) {
    Write-Error "Vite build failed"
    exit $LASTEXITCODE
}

Write-Host "Build completed successfully!" -ForegroundColor Green
