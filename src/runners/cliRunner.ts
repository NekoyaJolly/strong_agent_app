import { runDevAgent } from '../agent/agent';
import { loadEnvForProject } from '../utils/env';
import { logger } from '../utils/logger';

export async function cliRunner({ project, task }: { project: string; task: string }) {
  loadEnvForProject(project);
  logger.info(`Starting agent for project=${project}`);
  const out = await runDevAgent(task, { project });
  console.log(out);
}