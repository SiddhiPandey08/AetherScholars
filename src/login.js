// Log in once in a visible browser; the session is saved to auth.json so scans can see pages behind login.
// Use a TEST account. auth.json holds session cookies: never commit or share it (it is in .gitignore).
import readline from 'node:readline/promises';
import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) { console.error('Usage: node src/login.js <login-page-url>'); process.exit(1); }
const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext();
await (await ctx.newPage()).goto(url);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
await rl.question('Log in in the opened browser window, then press Enter here... ');
rl.close();
await ctx.storageState({ path: process.env.AUTH_FILE || 'auth.json' });
await browser.close();
console.log('Saved login session.');
