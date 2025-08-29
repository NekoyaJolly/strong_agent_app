import { z } from 'zod';

/**
 * Guardrails - 出力スキーマと承認ルール
 * Zodスキーマを使用してデータ検証を行います
 */

// ファイル操作の承認スキーマ
export const FileOperationSchema = z.object({
  operation: z.enum(['read', 'write', 'delete']),
  path: z.string().min(1),
  approved: z.boolean().default(false),
  approver: z.string().optional(),
  timestamp: z.date().default(() => new Date())
});

// デプロイメント承認スキーマ
export const DeploymentApprovalSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']),
  version: z.string().min(1),
  changes: z.array(z.string()),
  approved: z.boolean().default(false),
  approver: z.string().optional(),
  approvalDate: z.date().optional()
});

// Agent出力スキーマ
export const AgentOutputSchema = z.object({
  action: z.string(),
  result: z.any(),
  metadata: z.object({
    timestamp: z.date().default(() => new Date()),
    agent: z.string().default('strong_agent'),
    version: z.string().default('1.0.0')
  }).default({})
});

/**
 * 承認ルール管理クラス
 */
export class GuardRails {
  private approvalRules: ApprovalRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * デフォルトの承認ルールを初期化
   */
  private initializeDefaultRules(): void {
    this.approvalRules = [
      {
        name: 'production_deployment',
        condition: (context: any) => context.environment === 'production',
        required: true,
        description: 'Production deployments require manual approval'
      },
      {
        name: 'critical_file_modification',
        condition: (context: any) => {
          const criticalPaths = ['/config/', '/security/', '/.env'];
          return criticalPaths.some(path => context.filePath?.includes(path));
        },
        required: true,
        description: 'Critical file modifications require approval'
      },
      {
        name: 'bulk_file_operations',
        condition: (context: any) => (context.fileCount || 0) > 10,
        required: true,
        description: 'Bulk file operations require approval'
      }
    ];
  }

  /**
   * 承認が必要かどうかをチェック
   */
  requiresApproval(context: any): { required: boolean; rules: ApprovalRule[] } {
    const applicableRules = this.approvalRules.filter(rule => 
      rule.required && rule.condition(context)
    );

    return {
      required: applicableRules.length > 0,
      rules: applicableRules
    };
  }

  /**
   * データ検証
   */
  validateFileOperation(data: any): FileOperationValidation {
    try {
      const validated = FileOperationSchema.parse(data);
      return { valid: true, data: validated };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Validation failed' 
      };
    }
  }

  validateDeploymentApproval(data: any): DeploymentValidation {
    try {
      const validated = DeploymentApprovalSchema.parse(data);
      return { valid: true, data: validated };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Validation failed' 
      };
    }
  }
}

export interface ApprovalRule {
  name: string;
  condition: (context: any) => boolean;
  required: boolean;
  description: string;
}

export interface FileOperationValidation {
  valid: boolean;
  data?: z.infer<typeof FileOperationSchema>;
  error?: string;
}

export interface DeploymentValidation {
  valid: boolean;
  data?: z.infer<typeof DeploymentApprovalSchema>;
  error?: string;
}

export type FileOperation = z.infer<typeof FileOperationSchema>;
export type DeploymentApproval = z.infer<typeof DeploymentApprovalSchema>;
export type AgentOutput = z.infer<typeof AgentOutputSchema>;
