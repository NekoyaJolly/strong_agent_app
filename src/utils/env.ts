import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

export function loadEnvForProject(projectName: string) {
  const base = process.cwd();
  const p1 = path.join(base, 'projects', projectName, '.env');
  const p2 = path.join(base, 'projects', projectName, '.env.agent');
  if (fs.existsSync(p2)) dotenv.config({ path: p2 });
  if (fs.existsSync(p1)) dotenv.config({ path: p1 });
  dotenv.config(); // fallback to root .env
}