import path from 'path';
import fs from 'fs/promises';

// Append a line to skilio-debug.log with timestamp.
export const appendDebugLog = async (rootDir: string, message: string) => {
  const logPath = path.join(rootDir, 'skilio-debug.log');
  const time = new Date().toISOString();
  await fs.appendFile(logPath, `[${time}] ${message}\n`, 'utf-8');
};
