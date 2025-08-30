import fs from 'fs/promises';
import path from 'node:path';
import { tool } from '@openai/agents';
import { z } from 'zod';

function normalize(p: string) {
  return path.resolve(process.cwd(), p);
}

async function pathIsSafe(resolvedPath: string) {
  const root = process.cwd();
  const rel = path.relative(root, resolvedPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return false;
  try {
    const parts = resolvedPath.split(path.sep);
    let cur = path.parse(resolvedPath).root;
    for (const part of parts.filter(Boolean)) {
      cur = path.join(cur, part);
      const st = await fs.lstat(cur);
      if (st.isSymbolicLink()) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const readFile = tool({
  name: 'read_file',
  description: 'Read a UTF-8 text file under the repo root (no symlinks).',
  parameters: z.object({ filepath: z.string() }),
  strict: true,
  async execute({ filepath }) {
    const resolved = normalize(filepath);
    if (!(await pathIsSafe(resolved))) {
      throw new Error('Access denied: path is outside repository or is a symlink');
    }
    const content = await fs.readFile(resolved, 'utf8');
    return { filepath: path.relative(process.cwd(), resolved), content };
  },
});