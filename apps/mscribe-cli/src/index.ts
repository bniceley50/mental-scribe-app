#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { auditCommand } from './commands/audit.js';
import { consentsCommand } from './commands/consents.js';
import { rlsCommand } from './commands/rls.js';
import { fhirCommand } from './commands/fhir.js';

const program = new Command();

program
  .name('mscribe')
  .description('Mental Scribe CLI - DevOps and administrative tools')
  .version('1.0.0');

// Add commands
program.addCommand(auditCommand);
program.addCommand(consentsCommand);
program.addCommand(rlsCommand);
program.addCommand(fhirCommand);

// Global error handler
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Unhandled error:'), error);
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
