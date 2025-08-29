/**
 * Permission ユーティリティ
 * write権限チェックロジック
 */
export class PermissionManager {
  private allowedPaths: string[] = [];
  private blockedPaths: string[] = [];
  private requireApproval: string[] = [];

  constructor(config?: PermissionConfig) {
    if (config) {
      this.allowedPaths = config.allowedPaths || [];
      this.blockedPaths = config.blockedPaths || [];
      this.requireApproval = config.requireApproval || [];
    }

    this.initializeDefaultPermissions();
  }

  /**
   * デフォルトの権限設定を初期化
   */
  private initializeDefaultPermissions(): void {
    // デフォルトで許可されるパス
    const defaultAllowed = [
      '/workspace/',
      '/tmp/',
      '/temp/'
    ];

    // デフォルトでブロックされるパス
    const defaultBlocked = [
      '/etc/',
      '/usr/',
      '/bin/',
      '/sbin/',
      '/root/',
      '/system/',
      '/.env',
      '/config/secrets'
    ];

    // デフォルトで承認が必要なパス
    const defaultApproval = [
      '/config/',
      '/src/',
      '/package.json',
      '/tsconfig.json',
      '/.gitignore'
    ];

    this.allowedPaths = [...new Set([...this.allowedPaths, ...defaultAllowed])];
    this.blockedPaths = [...new Set([...this.blockedPaths, ...defaultBlocked])];
    this.requireApproval = [...new Set([...this.requireApproval, ...defaultApproval])];
  }

  /**
   * 読み取り権限をチェック
   */
  checkReadPermission(filePath: string): PermissionResult {
    // ブロックされたパスのチェック
    if (this.isPathBlocked(filePath)) {
      return {
        allowed: false,
        reason: 'Path is explicitly blocked for read access',
        requiresApproval: false
      };
    }

    // 基本的に読み取りは許可（セキュリティに関わるファイル以外）
    return {
      allowed: true,
      reason: 'Read access granted',
      requiresApproval: false
    };
  }

  /**
   * 書き込み権限をチェック
   */
  checkWritePermission(filePath: string): PermissionResult {
    // ブロックされたパスのチェック
    if (this.isPathBlocked(filePath)) {
      return {
        allowed: false,
        reason: 'Path is explicitly blocked for write access',
        requiresApproval: false
      };
    }

    // 承認が必要なパスのチェック
    if (this.isApprovalRequired(filePath)) {
      return {
        allowed: true,
        reason: 'Write access allowed with approval',
        requiresApproval: true,
        approvalReason: 'Critical file modification requires approval'
      };
    }

    // 許可されたパスのチェック
    if (this.isPathAllowed(filePath)) {
      return {
        allowed: true,
        reason: 'Path is in allowed list',
        requiresApproval: false
      };
    }

    // デフォルトは承認が必要
    return {
      allowed: true,
      reason: 'Write access allowed with approval (default policy)',
      requiresApproval: true,
      approvalReason: 'File modification outside workspace requires approval'
    };
  }

  /**
   * 削除権限をチェック
   */
  checkDeletePermission(filePath: string): PermissionResult {
    // ブロックされたパスのチェック
    if (this.isPathBlocked(filePath)) {
      return {
        allowed: false,
        reason: 'Path is explicitly blocked for delete access',
        requiresApproval: false
      };
    }

    // 削除は常に承認が必要
    return {
      allowed: true,
      reason: 'Delete access allowed with approval',
      requiresApproval: true,
      approvalReason: 'File deletion always requires approval'
    };
  }

  /**
   * 実行権限をチェック
   */
  checkExecutePermission(command: string, workingDir?: string): PermissionResult {
    // 危険なコマンドのチェック
    const dangerousCommands = [
      'rm -rf',
      'format',
      'mkfs',
      'dd if=',
      'sudo',
      'chmod 777',
      'chown'
    ];

    for (const dangerous of dangerousCommands) {
      if (command.toLowerCase().includes(dangerous.toLowerCase())) {
        return {
          allowed: false,
          reason: `Command contains dangerous pattern: ${dangerous}`,
          requiresApproval: false
        };
      }
    }

    // システムディレクトリでの実行チェック
    if (workingDir && this.isPathBlocked(workingDir)) {
      return {
        allowed: false,
        reason: 'Execution not allowed in blocked directory',
        requiresApproval: false
      };
    }

    // 基本的なコマンドは許可
    const safeCommands = ['ls', 'cat', 'echo', 'pwd', 'git status', 'npm install'];
    if (safeCommands.some(safe => command.startsWith(safe))) {
      return {
        allowed: true,
        reason: 'Safe command execution allowed',
        requiresApproval: false
      };
    }

    // その他のコマンドは承認が必要
    return {
      allowed: true,
      reason: 'Command execution allowed with approval',
      requiresApproval: true,
      approvalReason: 'Command execution requires approval'
    };
  }

  /**
   * パスがブロックされているかチェック
   */
  private isPathBlocked(filePath: string): boolean {
    return this.blockedPaths.some(blocked => 
      filePath.startsWith(blocked) || filePath.includes(blocked)
    );
  }

  /**
   * パスが許可されているかチェック
   */
  private isPathAllowed(filePath: string): boolean {
    return this.allowedPaths.some(allowed => 
      filePath.startsWith(allowed)
    );
  }

  /**
   * 承認が必要かチェック
   */
  private isApprovalRequired(filePath: string): boolean {
    return this.requireApproval.some(approval => 
      filePath.includes(approval)
    );
  }

  /**
   * 許可されたパスを追加
   */
  addAllowedPath(path: string): void {
    if (!this.allowedPaths.includes(path)) {
      this.allowedPaths.push(path);
    }
  }

  /**
   * ブロックされたパスを追加
   */
  addBlockedPath(path: string): void {
    if (!this.blockedPaths.includes(path)) {
      this.blockedPaths.push(path);
    }
  }

  /**
   * 承認が必要なパスを追加
   */
  addApprovalPath(path: string): void {
    if (!this.requireApproval.includes(path)) {
      this.requireApproval.push(path);
    }
  }

  /**
   * 権限設定を取得
   */
  getPermissionConfig(): PermissionConfig {
    return {
      allowedPaths: [...this.allowedPaths],
      blockedPaths: [...this.blockedPaths],
      requireApproval: [...this.requireApproval]
    };
  }
}

export interface PermissionConfig {
  allowedPaths?: string[];
  blockedPaths?: string[];
  requireApproval?: string[];
}

export interface PermissionResult {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
  approvalReason?: string;
}

export type PermissionAction = 'read' | 'write' | 'delete' | 'execute';

// シングルトンインスタンスのエクスポート
export const permissionManager = new PermissionManager();
