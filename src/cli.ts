#!/usr/bin/env node
import { Command } from 'commander';
import { sourcemapsUpload } from './commands/sourcemaps-upload';
import pc from 'picocolors';

const pkg = require('../package.json');

const program = new Command();

program
  .name('abrova-trace')
  .description('Command-line tool for Abrova Trace')
  .version(pkg.version, '-v, --version', 'output the version number');

const sourcemaps = program
  .command('sourcemaps')
  .description('Manage sourcemaps for release stack trace resolution');

sourcemaps
  .command('upload <directory>')
  .description('Upload every .map file in <directory> to a Abrova Trace release')
  .option('--project <id>', 'Project ID (copy from the Trace project page). Falls back to ABROVA_TRACE_PROJECT env var')
  .option('--dsn <id>', 'Alias for --project (kept for backward compatibility)')
  .requiredOption('--release <version>', 'Release version this bundle belongs to (e.g. "1.2.3")')
  .option('--token <token>', 'Personal access token (ab_pat_xxx). Falls back to ABROVA_TRACE_TOKEN env var')
  .option('--api-url <url>', 'Override Trace API URL (default: https://trace.abrova.ir, or ABROVA_TRACE_API_URL env var)')
  .option('--dry-run', 'List files that would be uploaded without sending them', false)
  .action(async (directory: string, options: any) => {
    try {
      await sourcemapsUpload({
        directory,
        project: options.project || options.dsn,
        release: options.release,
        token: options.token,
        apiUrl: options.apiUrl,
        dryRun: options.dryRun,
      });
    } catch (err: any) {
      console.error(pc.red(`\nerror: ${err.message}`));
      process.exit(1);
    }
  });

program.parse();
