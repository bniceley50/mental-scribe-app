import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getSupabaseAdminClient, exitWithError } from '../utils.js';

/**
 * Verify audit chain integrity
 */
export const auditVerifyCommand = new Command('verify')
  .description('Verify the integrity of the audit chain')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const spinner = ora('Verifying audit chain...').start();

    try {
      const supabase = getSupabaseAdminClient();

      // Call the audit-verify edge function
      const { data, error } = await supabase.functions.invoke('audit-verify', {
        method: 'POST',
      });

      spinner.stop();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No response from audit verification');
      }

      const result = data as {
        intact: boolean;
        totalEntries: number;
        verifiedAt: string;
        error?: string;
        brokenLink?: { index: number; expected: string; actual: string };
      };

      if (result.intact) {
        console.log(chalk.green('✓ Audit chain is intact'));
        console.log(chalk.gray(`  Total entries: ${result.totalEntries}`));
        console.log(chalk.gray(`  Verified at: ${new Date(result.verifiedAt).toLocaleString()}`));
      } else {
        console.log(chalk.red('✗ Audit chain integrity compromised'));
        if (result.error) {
          console.log(chalk.red(`  Error: ${result.error}`));
        }
        if (result.brokenLink) {
          console.log(chalk.yellow('  Broken link detected:'));
          console.log(chalk.gray(`    Entry index: ${result.brokenLink.index}`));
          console.log(chalk.gray(`    Expected hash: ${result.brokenLink.expected}`));
          console.log(chalk.gray(`    Actual hash: ${result.brokenLink.actual}`));
        }
        process.exit(1);
      }

      if (options.verbose) {
        console.log(chalk.gray('\nFull result:'));
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      spinner.stop();
      exitWithError(error instanceof Error ? error.message : String(error));
    }
  });

/**
 * Show recent audit entries
 */
export const auditListCommand = new Command('list')
  .description('List recent audit entries')
  .option('-n, --limit <number>', 'Number of entries to show', '10')
  .option('--action <action>', 'Filter by action type')
  .action(async (options) => {
    const spinner = ora('Fetching audit entries...').start();

    try {
      const supabase = getSupabaseAdminClient();
      const limit = parseInt(options.limit, 10);

      let query = supabase
        .from('audit_chain')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (options.action) {
        query = query.eq('action', options.action);
      }

      const { data, error } = await query;

      spinner.stop();

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        console.log(chalk.yellow('No audit entries found'));
        return;
      }

      console.log(chalk.bold(`\nRecent Audit Entries (${data.length}):\n`));

      data.forEach((entry, index) => {
        console.log(chalk.cyan(`[${index + 1}] ${entry.action}`));
        console.log(chalk.gray(`    Resource: ${entry.resource}:${entry.resource_id}`));
        console.log(chalk.gray(`    Actor: ${entry.actor_id}`));
        console.log(chalk.gray(`    Time: ${new Date(entry.timestamp).toLocaleString()}`));
        console.log(chalk.gray(`    Hash: ${entry.hash.substring(0, 16)}...`));
        if (entry.details) {
          console.log(chalk.gray(`    Details: ${JSON.stringify(entry.details)}`));
        }
        console.log();
      });
    } catch (error) {
      spinner.stop();
      exitWithError(error instanceof Error ? error.message : String(error));
    }
  });

/**
 * Export audit log
 */
export const auditExportCommand = new Command('export')
  .description('Export audit log to JSON file')
  .option('-o, --output <file>', 'Output file path', 'audit-export.json')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .action(async (options) => {
    const spinner = ora('Exporting audit log...').start();

    try {
      const supabase = getSupabaseAdminClient();
      const { writeFile } = await import('fs/promises');

      let query = supabase.from('audit_chain').select('*').order('timestamp', { ascending: true });

      if (options.from) {
        query = query.gte('timestamp', new Date(options.from).toISOString());
      }

      if (options.to) {
        query = query.lte('timestamp', new Date(options.to).toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      spinner.text = 'Writing to file...';

      await writeFile(
        options.output,
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            totalEntries: data?.length || 0,
            filters: {
              from: options.from || null,
              to: options.to || null,
            },
            entries: data || [],
          },
          null,
          2
        )
      );

      spinner.stop();

      console.log(chalk.green(`✓ Exported ${data?.length || 0} entries to ${options.output}`));
    } catch (error) {
      spinner.stop();
      exitWithError(error instanceof Error ? error.message : String(error));
    }
  });

/**
 * Main audit command with subcommands
 */
export const auditCommand = new Command('audit')
  .description('Audit chain management and verification')
  .addCommand(auditVerifyCommand)
  .addCommand(auditListCommand)
  .addCommand(auditExportCommand);
