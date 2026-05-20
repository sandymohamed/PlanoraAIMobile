# Clean Android build artifacts including CMake cache
Write-Host "Cleaning Android build artifacts..."

# Remove CMake cache directories (handle long paths on Windows)
if (Test-Path "app\.cxx") {
    Write-Host "Removing CMake cache..."
    try {
        # Use robocopy to handle long paths on Windows
        $emptyDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
        robocopy $emptyDir "app\.cxx" /MIR /R:0 /W:0 /NFL /NDL /NJH /NJS | Out-Null
        Remove-Item "app\.cxx" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item $emptyDir -Recurse -Force
    } catch {
        Write-Host "Warning: Could not fully remove CMake cache (long path issue). Continuing..." -ForegroundColor Yellow
        # Try alternative method
        Get-ChildItem "app\.cxx" -Recurse -Force | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
        Remove-Item "app\.cxx" -Force -Recurse -ErrorAction SilentlyContinue
    }
}

# Remove autolinking generated files
if (Test-Path "app\build\generated\autolinking") {
    Write-Host "Removing autolinking generated files..."
    Remove-Item -Recurse -Force "app\build\generated\autolinking"
}

# Run Gradle clean
Write-Host "Running Gradle clean..."
./gradlew clean

Write-Host "Clean completed!"

