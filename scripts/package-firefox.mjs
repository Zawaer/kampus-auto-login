import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distFirefoxDir = path.join(rootDir, 'dist', 'firefox');
const manifestPath = path.join(distFirefoxDir, 'manifest.json');
const releasesDir = path.join(rootDir, 'dist', 'releases');

async function getManifestVersion() {
  const manifestText = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestText);
  if (!manifest.version) {
    throw new Error('dist/firefox/manifest.json is missing a version field');
  }
  return manifest.version;
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main() {
  const version = await getManifestVersion();
  const outputZip = path.join(releasesDir, `kampus-auto-login-firefox-v${version}.zip`);

  await mkdir(releasesDir, { recursive: true });
  await rm(outputZip, { force: true });

  // -X strips extra macOS metadata and avoids __MACOSX / AppleDouble files.
  await runCommand('zip', ['-r', '-X', outputZip, '.', '-x', '*/.*', '.*', '__MACOSX/*'], distFirefoxDir);
  console.log(`Created ${path.relative(rootDir, outputZip)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
