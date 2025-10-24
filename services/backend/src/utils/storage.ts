import fs from 'fs-extra';
import path from 'path';

const DATA_DIR = '.cs720';

export async function ensureDataDirectory(): Promise<void> {
  const dirs = [
    DATA_DIR,
    path.join(DATA_DIR, 'auth'),
    path.join(DATA_DIR, 'logs'),
    path.join(DATA_DIR, 'sync-history'),
    path.join(DATA_DIR, 'documents'),
    path.join(DATA_DIR, 'cache')
  ];

  for (const dir of dirs) {
    await fs.ensureDir(dir);
  }
}

export async function writeDataFile(filename: string, data: any): Promise<void> {
  await ensureDataDirectory();
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeJson(filePath, data, { spaces: 2 });
}

export async function readDataFile(filename: string): Promise<any> {
  const filePath = path.join(DATA_DIR, filename);

  if (!await fs.pathExists(filePath)) {
    return null;
  }

  return fs.readJson(filePath);
}

export async function appendToLogFile(logName: string, entry: any): Promise<void> {
  await ensureDataDirectory();
  const logPath = path.join(DATA_DIR, 'logs', `${logName}.log`);

  const logEntry = {
    timestamp: new Date().toISOString(),
    ...entry
  };

  await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
}

export function getDataDirectory(): string {
  return DATA_DIR;
}