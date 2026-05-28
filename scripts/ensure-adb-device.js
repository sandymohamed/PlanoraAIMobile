/**
 * Fail fast when no authorized Android device is connected (avoids cryptic Gradle installDebug errors).
 */
const { execSync } = require('child_process');

function listDevices() {
  try {
    return execSync('adb devices', { encoding: 'utf8' });
  } catch (e) {
    console.error('\n[Planora] adb not found. Install Android platform-tools and add adb to PATH.\n');
    process.exit(1);
  }
}

const out = listDevices();
const lines = out.split('\n').slice(1).filter((l) => l.trim());
const entries = lines.map((line) => {
  const [id, status] = line.trim().split(/\s+/);
  return { id, status };
});

const ready = entries.filter((d) => d.status === 'device');
const unauthorized = entries.filter((d) => d.status === 'unauthorized');
const offline = entries.filter((d) => d.status === 'offline');

if (ready.length > 0) {
  console.log(`[Planora] ADB OK — ${ready.length} device(s): ${ready.map((d) => d.id).join(', ')}`);
  process.exit(0);
}

console.error('\n[Planora] Cannot install APK — no authorized Android device.\n');
console.error('adb devices output:\n' + out);

if (unauthorized.length > 0) {
  console.error(
    'Your phone is connected but UNAUTHORIZED.\n' +
      '  1. Unlock the phone\n' +
      '  2. Unplug USB, plug back in\n' +
      '  3. Tap "Allow USB debugging" on the phone (check "Always allow")\n' +
      '  4. If no prompt: Settings → Developer options → Revoke USB debugging authorizations, then reconnect\n' +
      '  5. Run: npm run adb:reset\n' +
      '  6. Run: npm run android\n'
  );
} else if (offline.length > 0) {
  console.error('Device is OFFLINE. Run: npm run adb:reset\n');
} else {
  console.error(
    'No device detected.\n' +
      '  • Enable USB debugging on the phone\n' +
      '  • Use a data USB cable (not charge-only)\n' +
      '  • Run: npm run adb:reset\n'
  );
}

process.exit(1);
