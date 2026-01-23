import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Determine OS-appropriate log directory
function getSystemLogDir(): string {
  const platform = os.platform();
  const homedir = os.homedir();

  switch (platform) {
    case 'darwin': // macOS
      return path.join(homedir, 'Library', 'Logs', 'hcc-jira-mcp');
    case 'win32': // Windows
      const appData = process.env.APPDATA || path.join(homedir, 'AppData', 'Roaming');
      return path.join(appData, 'hcc-jira-mcp', 'logs');
    default: // Linux and others
      return path.join(homedir, '.local', 'share', 'hcc-jira-mcp', 'logs');
  }
}

const LOG_DIR = getSystemLogDir();
const LOG_FILE = path.join(LOG_DIR, 'jira-mcp.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure log directory exists
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Rotate log file if it's too large
function rotateLogIfNeeded() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        const backupFile = path.join(LOG_DIR, `jira-mcp.log.${Date.now()}`);
        fs.renameSync(LOG_FILE, backupFile);

        // Keep only the last 3 backup files
        const files = fs.readdirSync(LOG_DIR)
          .filter(f => f.startsWith('jira-mcp.log.'))
          .sort()
          .reverse();

        files.slice(3).forEach(f => {
          fs.unlinkSync(path.join(LOG_DIR, f));
        });
      }
    }
  } catch (error) {
    // Silently fail if rotation fails
  }
}

function writeLog(level: string, ...args: any[]) {
  try {
    ensureLogDir();
    rotateLogIfNeeded();

    const timestamp = new Date().toISOString();
    const message = args
      .map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg))
      .join(' ');

    const logEntry = `[${timestamp}] [${level}] ${message}\n`;

    fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
  } catch (error) {
    // Silently fail if logging fails - don't crash the application
  }
}

export const logger = {
  log: (...args: any[]) => writeLog('INFO', ...args),
  error: (...args: any[]) => writeLog('ERROR', ...args),
  warn: (...args: any[]) => writeLog('WARN', ...args),
  info: (...args: any[]) => writeLog('INFO', ...args),
  getLogFile: () => LOG_FILE,
  getLogDir: () => LOG_DIR,
};

export default logger;
