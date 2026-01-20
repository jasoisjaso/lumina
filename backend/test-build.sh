#!/bin/bash

# Test local TypeScript build
set -e

echo "=== Testing TypeScript Build ==="
echo ""

# Clean dist directory
echo "Cleaning dist directory..."
rm -rf dist
echo "✓ Clean complete"
echo ""

# Run TypeScript compiler
echo "Running TypeScript compiler..."
npx tsc --skipLibCheck
echo "✓ TypeScript compilation complete"
echo ""

# Verify output
echo "Verifying build output..."
echo ""
echo "Contents of dist/:"
ls -la dist/
echo ""

if [ -f "dist/server.js" ]; then
    echo "✓ dist/server.js exists"
else
    echo "✗ ERROR: dist/server.js not found!"
    exit 1
fi

if [ -f "dist/config/index.js" ]; then
    echo "✓ dist/config/index.js exists"
else
    echo "✗ ERROR: dist/config/index.js not found!"
    exit 1
fi

if [ -f "dist/database/knex.js" ]; then
    echo "✓ dist/database/knex.js exists"
else
    echo "✗ ERROR: dist/database/knex.js not found!"
    exit 1
fi

echo ""
echo "=== Build Verification Complete ==="
echo "All expected files are present!"
