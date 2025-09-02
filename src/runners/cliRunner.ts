import { run } from '@openai/agents';
import { triageAgent } from '../agent/triage.js';
import { getConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export async function cliRunner({ project, task }: { project: string; task: string }) {
  try {
    // 統合設定システムでプロジェクト固有の設定を読み込み
    const config = await getConfig(project);
    
    logger.info(`Starting agent for project=${project}`);
    logger.debug('Configuration loaded:', { 
      agentName: config.agent.name,
      modelProvider: config.agent.model.provider,
      modelName: config.agent.model.model 
    });

    const result = await run(triageAgent, task, {
      maxTurns: config.env.maxTurns
    });
    
    const out = {
      finalOutput: result.finalOutput,
      agentName: triageAgent.name,
      result: result,
    };
    console.log(out);
  } catch (error) {
    logger.error('CLI runner failed:', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}