import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { getSupabaseClient, exitWithError, formatDate } from '../utils.js';

/**
 * List all patient consents
 */
export const consentsListCommand = new Command('list')
  .description('List all patient consents')
  .option('-p, --patient <id>', 'Filter by patient ID')
  .option('--expired', 'Show only expired consents')
  .option('--active', 'Show only active consents')
  .action(async (options) => {
    const spinner = ora('Fetching consents...').start();

    try {
      const supabase = getSupabaseClient();

      let query = supabase.from('patient_consents').select(`
        *,
        clients!patient_id (
          first_name,
          last_name
        )
      `).order('granted_at', { ascending: false });

      if (options.patient) {
        query = query.eq('patient_id', options.patient);
      }

      const { data, error } = await query;

      spinner.stop();

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        console.log(chalk.yellow('No consents found'));
        return;
      }

      // Filter expired/active if requested
      let filteredData = data;
      const now = new Date();

      if (options.expired) {
        filteredData = data.filter(c => c.expires_at && new Date(c.expires_at) < now);
      } else if (options.active) {
        filteredData = data.filter(c => !c.expires_at || new Date(c.expires_at) >= now);
      }

      // Create table
      const tableData = [
        ['Patient ID', 'Patient Name', 'Granted', 'Expires', 'Status'],
        ...filteredData.map(consent => [
          consent.patient_id.substring(0, 8) + '...',
          consent.clients
            ? `${consent.clients.first_name} ${consent.clients.last_name}`
            : 'Unknown',
          formatDate(consent.granted_at),
          consent.expires_at ? formatDate(consent.expires_at) : 'Never',
          consent.expires_at && new Date(consent.expires_at) < now
            ? chalk.red('Expired')
            : chalk.green('Active'),
        ]),
      ];

      console.log('\n' + table(tableData));
      console.log(chalk.gray(`Total: ${filteredData.length} consent(s)`));
    } catch (error) {
      spinner.stop();
      exitWithError(error instanceof Error ? error.message : String(error));
    }
  });

/**
 * Generate consent report
 */
export const consentsReportCommand = new Command('report')
  .description('Generate consent compliance report')
  .option('-o, --output <file>', 'Output file (JSON or CSV)', 'consent-report.json')
  .action(async (options) => {
    const spinner = ora('Generating consent report...').start();

    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase.from('patient_consents').select(`
        *,
        clients!patient_id (
          first_name,
          last_name
        )
      `);

      if (error) {
        throw error;
      }

      spinner.text = 'Analyzing consent data...';

      const now = new Date();
      const active = data?.filter(c => !c.expires_at || new Date(c.expires_at) >= now) || [];
      const expired = data?.filter(c => c.expires_at && new Date(c.expires_at) < now) || [];
      const expiringNext30Days = active.filter(
        c => c.expires_at && new Date(c.expires_at) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      );

      const report = {
        generatedAt: new Date().toISOString(),
        summary: {
          total: data?.length || 0,
          active: active.length,
          expired: expired.length,
          expiringNext30Days: expiringNext30Days.length,
          complianceRate: data?.length ? ((active.length / data.length) * 100).toFixed(2) + '%' : 'N/A',
        },
        activeConsents: active.map(c => ({
          patientId: c.patient_id,
          patientName: c.clients
            ? `${c.clients.first_name} ${c.clients.last_name}`
            : 'Unknown',
          grantedAt: c.granted_at,
          expiresAt: c.expires_at,
        })),
        expiredConsents: expired.map(c => ({
          patientId: c.patient_id,
          patientName: c.clients
            ? `${c.clients.first_name} ${c.clients.last_name}`
            : 'Unknown',
          grantedAt: c.granted_at,
          expiredAt: c.expires_at,
        })),
        expiringNext30Days: expiringNext30Days.map(c => ({
          patientId: c.patient_id,
          patientName: c.clients
            ? `${c.clients.first_name} ${c.clients.last_name}`
            : 'Unknown',
          expiresAt: c.expires_at,
          daysUntilExpiry: Math.ceil(
            (new Date(c.expires_at!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          ),
        })),
      };

      spinner.text = 'Writing report...';
      const { writeFile } = await import('fs/promises');
      await writeFile(options.output, JSON.stringify(report, null, 2));

      spinner.stop();

      console.log(chalk.green(`\n✓ Consent Report Generated\n`));
      console.log(chalk.bold('Summary:'));
      console.log(chalk.gray(`  Total consents: ${report.summary.total}`));
      console.log(chalk.green(`  Active: ${report.summary.active}`));
      console.log(chalk.red(`  Expired: ${report.summary.expired}`));
      console.log(chalk.yellow(`  Expiring (30 days): ${report.summary.expiringNext30Days}`));
      console.log(chalk.blue(`  Compliance rate: ${report.summary.complianceRate}`));
      console.log(chalk.gray(`\n  Report saved to: ${options.output}`));
    } catch (error) {
      spinner.stop();
      exitWithError(error instanceof Error ? error.message : String(error));
    }
  });

/**
 * Main consents command
 */
export const consentsCommand = new Command('consents')
  .description('Patient consent management and reporting')
  .addCommand(consentsListCommand)
  .addCommand(consentsReportCommand);
