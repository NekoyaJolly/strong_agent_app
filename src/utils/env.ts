/**
 * @deprecated このモジュールは非推奨です。代わりに utils/config.ts の統合設定管理を使用してください。
 * 後方互換性のために残されています。
 */
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { configManager } from './config.js';

/**
 * @deprecated utils/config.ts の getConfig() を使用してください
 */
export function loadEnvForProject(projectName: string) {
  console.warn('loadEnvForProject is deprecated. Use getConfig() from utils/config.ts instead.');
  
  const base = process.cwd();
  const p1 = path.join(base, 'projects', projectName, '.env');
  const p2 = path.join(base, 'projects', projectName, '.env.agent');
  if (fs.existsSync(p2)) dotenv.config({ path: p2 });
  if (fs.existsSync(p1)) dotenv.config({ path: p1 });
  dotenv.config(); // fallback to root .env
}

/**
 * @deprecated 内部的に config.ts で処理されます
 */
export function loadOpenAIKeyFromSecrets() {
  console.warn('loadOpenAIKeyFromSecrets is deprecated. This is now handled automatically in the config system.');
  
  const p = process.env.OPENAI_API_KEY_FILE ?? '/run/secrets/openai_api_key';
  if (fs.existsSync(p)) {
    const key = fs.readFileSync(p, 'utf8').trim();
    if (key && !process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = key;
  }
}

/**
 * 統合設定システムを使用した便利関数
 */
export function initializeConfig(projectName?: string) {
  return configManager.loadConfig(projectName);
}
