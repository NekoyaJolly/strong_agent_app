import fs from 'fs/promises';
import { tool } from '@openai/agents';
import { z } from 'zod';

export const readFile = tool({
  name: 'read_file',
  description: 'Read UTF-8 text file under project dir',
  parameters: z.object({ filepath: z.string() }),
  async execute({ filepath }) {
    const content = await fs.readFile(filepath, 'utf8');
    return { filepath, content };
  }
});