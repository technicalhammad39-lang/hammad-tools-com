import { cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectory(source, target) {
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true, force: true });
}

async function main() {
  const root = process.cwd();
  const nextDir = path.join(root, '.next');
  const standaloneDir = path.join(nextDir, 'standalone');
  const nextStaticSource = path.join(nextDir, 'static');
  const nextStaticTarget = path.join(standaloneDir, '.next', 'static');
  const publicSource = path.join(root, 'public');
  const publicTarget = path.join(standaloneDir, 'public');

  if (!(await pathExists(standaloneDir))) {
    console.warn('[prepare-standalone] .next/standalone not found; skipping copy step.');
    return;
  }

  if (await pathExists(nextStaticSource)) {
    await copyDirectory(nextStaticSource, nextStaticTarget);
    console.log('[prepare-standalone] Copied .next/static -> .next/standalone/.next/static');
  } else {
    console.warn('[prepare-standalone] .next/static not found.');
  }

  if (await pathExists(publicSource)) {
    await copyDirectory(publicSource, publicTarget);
    console.log('[prepare-standalone] Copied public -> .next/standalone/public');
  } else {
    console.warn('[prepare-standalone] public directory not found.');
  }
}

main().catch((error) => {
  console.error('[prepare-standalone] Failed:', error);
  process.exit(1);
});
