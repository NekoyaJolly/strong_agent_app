import { runAgent } from '../agent/agent.js';
import { loadEnvForProject } from '../utils/env.js';
import { logger } from '../utils/logger.js';

export async function cliRunner({ project, task }: { project: string; task: string }) {
  loadEnvForProject(project);
  logger.info(`Starting agent for project=${project}`);
  const out = await runAgent(task);
  console.log(out);
}