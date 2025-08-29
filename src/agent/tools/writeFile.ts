import * as fs from 'fs';
import * as path from 'path';

/**
 * ファイル書き込みツール
 * 指定されたパスにファイルを書き込みます
 */
export class WriteFileTool {
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await fs.promises.writeFile(filePath, content, 'utf8');
      console.log(`File written successfully: ${filePath}`);
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
  }

  async appendFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.promises.appendFile(filePath, content, 'utf8');
      console.log(`Content appended to file: ${filePath}`);
    } catch (error) {
      throw new Error(`Failed to append to file ${filePath}: ${error}`);
    }
  }
}
