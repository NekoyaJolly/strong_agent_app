import type { InputGuardrail, OutputGuardrail } from '@openai/agents';

// 1) Basic secret-token leak prevention
export const noSecretsGuardrail: InputGuardrail = {
  name: 'no-secrets',
  execute({ input }) {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    const token =
      /(sk-[A-Za-z0-9_-]{10,})/i.test(text) ||
      /api[_-]?key/i.test(text) ||
      /authorization:\s*bearer\s+[A-Za-z0-9._-]+/i.test(text);
    return Promise.resolve({ tripwireTriggered: token, outputInfo: { token } });
  },
};

// 2) Prevent giant JSON payloads  
export const compactJsonGuardrail: OutputGuardrail = {
  name: 'compact-json',
  execute({ agentOutput }) {
    const s = JSON.stringify(agentOutput || {});
    const tooLarge = s.length > 120000;
    return Promise.resolve({ tripwireTriggered: tooLarge, outputInfo: { size: s.length } });
  },
};