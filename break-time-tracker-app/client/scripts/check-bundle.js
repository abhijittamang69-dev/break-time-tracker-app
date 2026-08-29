#!/usr/bin/env node
/**
 * Pre-push bundle size checker
 * Run: node scripts/check-bundle.js
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const DIST_DIR = 'dist/assets';
const MAX_CHUNK_SIZE_KB = 350;

function formatSize(bytes) {
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(2)}MB` : `${kb.toFixed(1)}KB`;
}

function checkBundle() {
  console.log('🔍 Checking bundle sizes...\n');

  try {
    const files = readdirSync(DIST_DIR).filter(f => f.endsWith('.js') || f.endsWith('.css'));
    
    if (files.length === 0) {
      console.log('⚠️  No build files found. Run "npm run build" first.');
      process.exit(1);
    }

    let totalJs = 0;
    let totalCss = 0;
    let failed = false;

    files.forEach(file => {
      const path = join(DIST_DIR, file);
      const stats = statSync(path);
      const sizeKb = stats.size / 1024;
      const isJs = file.endsWith('.js');

      if (isJs) totalJs += stats.size;
      else totalCss += stats.size;

      const icon = sizeKb > MAX_CHUNK_SIZE_KB ? '❌' : '✅';
      const warning = sizeKb > MAX_CHUNK_SIZE_KB ? ` (exceeds ${MAX_CHUNK_SIZE_KB}KB limit)` : '';
      
      console.log(`${icon} ${file}: ${formatSize(stats.size)}${warning}`);

      if (sizeKb > MAX_CHUNK_SIZE_KB) {
        failed = true;
      }
    });

    console.log(`\n📦 Total JS: ${formatSize(totalJs)}`);
    console.log(`🎨 Total CSS: ${formatSize(totalCss)}`);
    console.log(`📊 Total: ${formatSize(totalJs + totalCss)}`);

    if (failed) {
      console.log('\n❌ Bundle size check FAILED.');
      console.log('💡 Tip: Use React.lazy() to split large chunks.');
      process.exit(1);
    } else {
      console.log('\n✅ Bundle size check PASSED.');
      process.exit(0);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkBundle();
