import { Agent, tool, run } from '@openai/agents';
import { OpenAIResponsesModel, setDefaultOpenAIKey, webSearchTool, codeInterpreterTool } from '@openai/agents-openai';

setDefaultOpenAIKey(process.env.OPENAI_API_KEY!);

export const devAgent = new Agent({
  name: 'Dev Assistant',
  instructions: 'You are a senior developer...',
  model: new OpenAIResponsesModel({ model: 'gpt-5' }),
  tools: [webSearchTool(), codeInterpreterTool()],
});

export async function runDevAgent(input: string, opts?: any) {
  const result = await run(devAgent, input);
  return result.finalOutput;
}