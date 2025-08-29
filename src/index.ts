import 'dotenv/config';
import { cliRunner } from './runners/cliRunner';

const args = process.argv.slice(2);
const project = args[0] || 'example-project-1';
const task = args.slice(1).join(' ') || 'Describe project and propose 3 tasks';

await cliRunner({ project, task });