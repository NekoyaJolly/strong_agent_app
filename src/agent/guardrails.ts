// src/agents/guardrails.ts
import { InputGuardrail, OutputGuardrail, run } from '@openai/agents';
import { z } from 'zod';

// シンプルな「秘密情報」検知（入力）
export const noSecretsGuardrail: InputGuardrail = {
  name: 'No-Secrets',
  async execute({ input }) {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    const hit = /(sk-(?:live|test|[A-Za-z0-9]{20,}))/i.test(text) || /API[_-]?KEY/i.test(text);
    return { tripwireTriggered: hit, outputInfo: { hit } };
  },
};

// 出力が巨大化/未構造化していないかを簡易チェック
export const compactJsonGuardrail: OutputGuardrail<any> = {
  name: 'Compact-JSON',
  async execute({ agentOutput }) {
    const serialized = JSON.stringify(agentOutput ?? {});
    const tooLarge = serialized.length > 120_000; // 120KB超は停止
    return { tripwireTriggered: tooLarge, outputInfo: { size: serialized.length } };
  },
};