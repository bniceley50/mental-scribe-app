import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getSupabaseAdminClient, exitWithError } from '../utils.js';

/**
 * Test RLS policies for a specific table
 */
export const rlsTestCommand = new Command('test')
  .description('Test Row Level Security policies')
  .option('-t, --table <name>', 'Table name to test')
  .option('-u, --user <id>', 'User ID to test with')
  .action(async (options) => {
    if (!options.table) {
      exitWithError('Table name is required. Use -t or --table');
    }

    const spinner = ora(`Testing RLS policies for table: ${options.table}...`).start();

    try {
      const supabase = getSupabaseAdminClient();

      // Test SELECT policy
      spinner.text = 'Testing SELECT policy...';
      const { error: selectError } = await supabase
        .from(options.table)
        .select('*')
        .limit(1);

      const selectResult = selectError
        ? chalk.red('✗ FAILED: ' + selectError.message)
        : chalk.green('✓ PASSED');

      // Test INSERT policy (with test data)
      spinner.text = 'Testing INSERT policy...';
      const testData = { test: true, created_at: new Date().toISOString() };
      const { error: insertError } = await supabase
        .from(options.table)
        .insert(testData)
        .select();

      const insertResult = insertError
        ? chalk.red('✗ FAILED: ' + insertError.message)
        : chalk.green('✓ PASSED');

      // Test UPDATE policy
      spinner.text = 'Testing UPDATE policy...';
      const { error: updateError } = await supabase
        .from(options.table)
        .update({ test: false })
        .eq('test', true)
        .select();

      const updateResult = updateError
        ? chalk.red('✗ FAILED: ' + updateError.message)
        : chalk.green('✓ PASSED');

      // Test DELETE policy
      spinner.text = 'Testing DELETE policy...';
      const { error: deleteError } = await supabase
        .from(options.table)
        .delete()
        .eq('test', true);

      const deleteResult = deleteError
        ? chalk.red('✗ FAILED: ' + deleteError.message)
        : chalk.green('✓ PASSED');

      spinner.stop();

      console.log(chalk.bold(`\nRLS Policy Test Results for "${options.table}":\n`));
      console.log(`  SELECT: ${selectResult}`);
      console.log(`  INSERT: ${insertResult}`);
      console.log(`  UPDATE: ${updateResult}`);
      console.log(`  DELETE: ${deleteResult}`);

      const passed = [!selectError, !insertError, !updateError, !deleteError].filter(Boolean).length;
      console.log(chalk.gray(`\nPassed: ${passed}/4 tests`));

      if (passed < 4) {
        console.log(chalk.yellow('\n⚠ Some RLS policies may need attention'));
      }
    } catch (error) {
      spinner.stop();
      exitWithError(error instanceof Error ? error.message : String(error));
    }
  });

/**
 * List all tables with RLS enabled
 */
export const rlsListCommand = new Command('list')
  .description('List all tables with RLS status')
  .action(async () => {
    const spinner = ora('Fetching RLS status...').start();

    try {
      const supabase = getSupabaseAdminClient();

      // Query pg_tables and pg_policies
      const { data, error } = await supabase.rpc('get_rls_status' as any);

      spinner.stop();

      if (error) {
        // Fallback: try to query information_schema
        console.log(chalk.yellow('⚠ RLS status function not available'));
        console.log(chalk.gray('Run this SQL to check RLS status manually:'));
        console.log(chalk.cyan(`
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
        `));
        return;
      }

      if (!data || data.length === 0) {
        console.log(chalk.yellow('No tables found'));
        return;
      }

      console.log(chalk.bold('\nRLS Status:\n'));
      data.forEach((row: any) => {
        const status = row.rls_enabled
          ? chalk.green('✓ Enabled')
          : chalk.red('✗ Disabled');
        console.log(`  ${row.tablename}: ${status}`);
      });
    } catch (error) {
      spinner.stop();
      exitWithError(error instanceof Error ? error.message : String(error));
    }
  });

/**
 * Main RLS command
 */
export const rlsCommand = new Command('rls')
  .description('Row Level Security policy testing and management')
  .addCommand(rlsTestCommand)
  .addCommand(rlsListCommand);
