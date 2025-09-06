import fs from 'fs/promises';
import path from 'node:path';
import { tool } from '@openai/agents';
import { z } from 'zod';

interface AllowConfig { allow: string[] }

async function loadAllowlist(): Promise<AllowConfig> {
  try {
    const raw = await fs.readFile(path.resolve(process.cwd(), 'allowed_writes.json'), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    
    // 型検証
    if (typeof parsed === 'object' && parsed !== null && 'allow' in parsed) {
      const candidate = parsed as { allow: unknown };
      if (Array.isArray(candidate.allow) && candidate.allow.every(item => typeof item === 'string')) {
        return { allow: candidate.allow };
      }
    }
    
    // 不正な形式の場合はデフォルト値を返す
    return { allow: [] };
  } catch {
    return { allow: [] };
  }
}

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function normalize(p: string) {
  return path.resolve(process.cwd(), p);
}

async function pathIsSafeWrite(resolvedPath: string, allow: string[]) {
  const root = process.cwd();
  const rel = path.relative(root, resolvedPath).replaceAll('\\', '/');
  if (rel.startsWith('..') || path.isAbsolute(rel)) return false;
  try {
    const parts = resolvedPath.split(path.sep);
    let cur = path.parse(resolvedPath).root;
    for (const part of parts.filter(Boolean)) {
      cur = path.join(cur, part);
      try {
        const st = await fs.lstat(cur);
        if (st.isSymbolicLink()) return false;
      } catch {
        break;
      }
    }
  } catch {
    return false;
  }
  const allowed = allow.some((pattern) => globToRegex(pattern).test(rel));
  return allowed;
}

export const writeFileSafe = tool({
  name: 'write_file_safe',
  description: 'Write UTF-8 text under allowed_writes.json paths. No traversal or symlinks.',
  parameters: z.object({
    filepath: z.string().min(1),
    content: z.string(),
    append: z.boolean().optional(),
  }),
  strict: true,
  async execute({ filepath, content, append }) {
    const resolved = normalize(filepath);
    const { allow } = await loadAllowlist();
    const ok = await pathIsSafeWrite(resolved, allow);
    if (!ok) {
      throw new Error('Write denied by allowlist');
    }
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    if (append) await fs.appendFile(resolved, content, 'utf8');
    else await fs.writeFile(resolved, content, 'utf8');
    return { filepath: path.relative(process.cwd(), resolved), bytes: Buffer.byteLength(content, 'utf8'), mode: append ? 'append' : 'write' };
  },
});
