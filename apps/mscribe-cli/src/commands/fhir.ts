import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getSupabaseClient, exitWithError } from '../utils.js';

/**
 * Export data in FHIR format
 */
export const fhirExportCommand = new Command('export')
  .description('Export patient data in FHIR format')
  .requiredOption('-p, --patient <id>', 'Patient ID to export')
  .option('-o, --output <file>', 'Output file path', 'fhir-export.json')
  .action(async (options) => {
    const spinner = ora(`Exporting FHIR data for patient ${options.patient}...`).start();

    try {
      const supabase = getSupabaseClient();

      // Fetch patient data
      spinner.text = 'Fetching patient information...';
      const { data: patient, error: patientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', options.patient)
        .single();

      if (patientError || !patient) {
        throw new Error('Patient not found');
      }

      // Fetch sessions
      spinner.text = 'Fetching sessions...';
      const { data: sessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('client_id', options.patient);

      if (sessionsError) {
        throw sessionsError;
      }

      // Fetch clinical notes
      spinner.text = 'Fetching clinical notes...';
      const { data: notes, error: notesError } = await supabase
        .from('clinical_notes')
        .select('*')
        .eq('patient_id', options.patient);

      if (notesError) {
        throw notesError;
      }

      // Build FHIR Bundle
      spinner.text = 'Building FHIR bundle...';
      const fhirBundle = {
        resourceType: 'Bundle',
        type: 'collection',
        timestamp: new Date().toISOString(),
        total: 1 + (sessions?.length || 0) + (notes?.length || 0),
        entry: [
          // Patient resource
          {
            fullUrl: `urn:uuid:${patient.id}`,
            resource: {
              resourceType: 'Patient',
              id: patient.id,
              name: [
                {
                  use: 'official',
                  family: patient.last_name,
                  given: [patient.first_name],
                },
              ],
              birthDate: patient.date_of_birth,
              gender: patient.gender?.toLowerCase(),
            },
          },
          // Session encounters
          ...(sessions?.map((session: any) => ({
            fullUrl: `urn:uuid:${session.id}`,
            resource: {
              resourceType: 'Encounter',
              id: session.id,
              status: 'finished',
              class: {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
                code: 'AMB',
                display: 'ambulatory',
              },
              subject: {
                reference: `Patient/${patient.id}`,
              },
              period: {
                start: session.session_date,
              },
            },
          })) || []),
          // Clinical notes as DocumentReference
          ...(notes?.map((note: any) => ({
            fullUrl: `urn:uuid:${note.id}`,
            resource: {
              resourceType: 'DocumentReference',
              id: note.id,
              status: 'current',
              type: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '11506-3',
                    display: 'Progress note',
                  },
                ],
              },
              subject: {
                reference: `Patient/${patient.id}`,
              },
              date: note.created_at,
              content: [
                {
                  attachment: {
                    contentType: 'text/plain',
                    data: Buffer.from(note.content || '').toString('base64'),
                  },
                },
              ],
            },
          })) || []),
        ],
      };

      // Write to file
      spinner.text = 'Writing FHIR bundle...';
      const { writeFile } = await import('fs/promises');
      await writeFile(options.output, JSON.stringify(fhirBundle, null, 2));

      spinner.stop();

      console.log(chalk.green(`\n✓ FHIR Export Complete\n`));
      console.log(chalk.gray(`  Patient: ${patient.first_name} ${patient.last_name}`));
      console.log(chalk.gray(`  Sessions: ${sessions?.length || 0}`));
      console.log(chalk.gray(`  Notes: ${notes?.length || 0}`));
      console.log(chalk.gray(`  Output: ${options.output}`));
    } catch (error) {
      spinner.stop();
      exitWithError(error instanceof Error ? error.message : String(error));
    }
  });

/**
 * Validate FHIR bundle
 */
export const fhirValidateCommand = new Command('validate')
  .description('Validate a FHIR bundle file')
  .requiredOption('-f, --file <path>', 'FHIR bundle file to validate')
  .action(async (options) => {
    const spinner = ora(`Validating FHIR bundle: ${options.file}...`).start();

    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(options.file, 'utf-8');
      const bundle = JSON.parse(content);

      // Basic validation
      const errors: string[] = [];

      if (bundle.resourceType !== 'Bundle') {
        errors.push('Resource type must be "Bundle"');
      }

      if (!bundle.type) {
        errors.push('Bundle type is required');
      }

      if (!Array.isArray(bundle.entry)) {
        errors.push('Bundle must have an entry array');
      } else {
        bundle.entry.forEach((entry: any, index: number) => {
          if (!entry.resource) {
            errors.push(`Entry ${index} is missing resource`);
          } else if (!entry.resource.resourceType) {
            errors.push(`Entry ${index} resource is missing resourceType`);
          }
        });
      }

      spinner.stop();

      if (errors.length === 0) {
        console.log(chalk.green('✓ FHIR bundle is valid'));
        console.log(chalk.gray(`  Resource type: ${bundle.resourceType}`));
        console.log(chalk.gray(`  Bundle type: ${bundle.type}`));
        console.log(chalk.gray(`  Entries: ${bundle.entry?.length || 0}`));
      } else {
        console.log(chalk.red('✗ FHIR bundle validation failed\n'));
        errors.forEach(err => console.log(chalk.red(`  - ${err}`)));
        process.exit(1);
      }
    } catch (error) {
      spinner.stop();
      exitWithError(error instanceof Error ? error.message : String(error));
    }
  });

/**
 * Main FHIR command
 */
export const fhirCommand = new Command('fhir')
  .description('FHIR data export and validation')
  .addCommand(fhirExportCommand)
  .addCommand(fhirValidateCommand);
