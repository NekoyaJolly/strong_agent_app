import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git操作ツール
 * Gitコマンドを実行するためのヘルパーツール
 */
export class GitTool {
  private workingDirectory: string;

  constructor(workingDirectory?: string) {
    this.workingDirectory = workingDirectory || process.cwd();
  }

  async status(): Promise<string> {
    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: this.workingDirectory
      });
      return stdout;
    } catch (error) {
      throw new Error(`Git status failed: ${error}`);
    }
  }

  async add(files: string[] = ['.']): Promise<void> {
    try {
      const fileList = files.join(' ');
      await execAsync(`git add ${fileList}`, {
        cwd: this.workingDirectory
      });
    } catch (error) {
      throw new Error(`Git add failed: ${error}`);
    }
  }

  async commit(message: string): Promise<void> {
    try {
      await execAsync(`git commit -m "${message}"`, {
        cwd: this.workingDirectory
      });
    } catch (error) {
      throw new Error(`Git commit failed: ${error}`);
    }
  }

  async push(branch = 'main'): Promise<void> {
    try {
      await execAsync(`git push origin ${branch}`, {
        cwd: this.workingDirectory
      });
    } catch (error) {
      throw new Error(`Git push failed: ${error}`);
    }
  }

  async createBranch(branchName: string): Promise<void> {
    try {
      await execAsync(`git checkout -b ${branchName}`, {
        cwd: this.workingDirectory
      });
    } catch (error) {
      throw new Error(`Git branch creation failed: ${error}`);
    }
  }
}
