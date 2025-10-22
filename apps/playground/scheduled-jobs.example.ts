/**
 * Example Scheduled Jobs
 * 
 * Demonstrates how to set up and configure common maintenance jobs
 */

import { JobScheduler } from '@mscribe/scheduler';

// Initialize scheduler
const scheduler = new JobScheduler({
  checkIntervalMs: 60000, // Check every minute
  maxConcurrentJobs: 3,
  verbose: true
});

/**
 * Job 1: Daily Database Cleanup
 * Runs every day at 2:00 AM UTC
 */
scheduler.register({
  id: 'daily-db-cleanup',
  name: 'Daily Database Cleanup',
  description: 'Archives old audit logs and cleans up expired sessions',
  schedule: '0 2 * * *', // Cron: Every day at 2:00 AM
  timeout: 300000, // 5 minutes
  retry: {
    maxAttempts: 3,
    delayMs: 60000, // 1 minute
    backoffMultiplier: 2
  },
  handler: async (context) => {
    context.log('Starting database cleanup');
    
    const startTime = Date.now();
    let archivedCount = 0;
    let deletedCount = 0;

    try {
      // Archive old audit logs (>90 days)
      context.log('Archiving old audit logs...');
      // In real implementation, this would call Supabase
      // const { count: archived } = await supabase.rpc('archive_old_audit_logs');
      archivedCount = 150; // Mock value

      // Delete expired sessions
      context.log('Cleaning up expired sessions...');
      // const { count: deleted } = await supabase.rpc('cleanup_expired_sessions');
      deletedCount = 42; // Mock value

      context.log(`Cleanup complete: ${archivedCount} logs archived, ${deletedCount} sessions deleted`);

      return {
        success: true,
        durationMs: Date.now() - startTime,
        data: { archivedCount, deletedCount },
        metrics: {
          archivedLogs: archivedCount,
          deletedSessions: deletedCount
        }
      };
    } catch (error) {
      context.log(`Cleanup failed: ${error}`, 'error');
      throw error;
    }
  }
});

/**
 * Job 2: Weekly Database Optimization
 * Runs every Sunday at 2:00 AM UTC
 */
scheduler.register({
  id: 'weekly-db-optimization',
  name: 'Weekly Database Optimization',
  description: 'Vacuum, analyze, and optimize database tables',
  schedule: '0 2 * * 0', // Cron: Every Sunday at 2:00 AM
  timeout: 600000, // 10 minutes
  retry: {
    maxAttempts: 2,
    delayMs: 300000 // 5 minutes
  },
  handler: async (context) => {
    context.log('Starting database optimization');

    try {
      // Run VACUUM ANALYZE
      context.log('Running VACUUM ANALYZE...');
      // await supabase.rpc('vacuum_analyze_database');

      // Update table statistics
      context.log('Updating table statistics...');
      // await supabase.rpc('update_table_statistics');

      context.log('Database optimization complete');

      return {
        success: true,
        durationMs: Date.now() - Date.now(),
        data: { optimized: true }
      };
    } catch (error) {
      context.log(`Optimization failed: ${error}`, 'error');
      throw error;
    }
  }
});

/**
 * Job 3: Hourly Health Check
 * Runs every hour
 */
scheduler.register({
  id: 'hourly-health-check',
  name: 'Hourly Health Check',
  description: 'Performs comprehensive system health check',
  schedule: '0 * * * *', // Cron: Every hour
  timeout: 30000, // 30 seconds
  retry: {
    maxAttempts: 3,
    delayMs: 60000,
    backoffMultiplier: 1
  },
  handler: async (context) => {
    context.log('Running health check');

    try {
      // Call health check endpoint
      const response = await fetch('/api/health');
      const health = await response.json();

      if (health.status === 'unhealthy') {
        context.log('System is unhealthy!', 'error');
        // Trigger alert
        // await alertOncall({ severity: 'high', message: 'Health check failed', details: health });
      } else if (health.status === 'degraded') {
        context.log('System is degraded', 'warn');
      } else {
        context.log('System is healthy');
      }

      return {
        success: true,
        durationMs: Date.now() - Date.now(),
        data: health,
        metrics: {
          healthScore: health.status === 'healthy' ? 100 : health.status === 'degraded' ? 50 : 0
        }
      };
    } catch (error) {
      context.log(`Health check failed: ${error}`, 'error');
      throw error;
    }
  }
});

/**
 * Job 4: Daily Backup Verification
 * Runs every day at 4:00 AM UTC
 */
scheduler.register({
  id: 'daily-backup-verification',
  name: 'Daily Backup Verification',
  description: 'Verifies database backups are valid and restorable',
  schedule: '0 4 * * *', // Cron: Every day at 4:00 AM
  timeout: 900000, // 15 minutes
  retry: {
    maxAttempts: 2,
    delayMs: 600000 // 10 minutes
  },
  handler: async (context) => {
    context.log('Starting backup verification');

    try {
      // Check latest backup exists
      context.log('Checking latest backup...');
      // const backup = await checkLatestBackup();

      // Verify backup integrity
      context.log('Verifying backup integrity...');
      // const isValid = await verifyBackupIntegrity(backup);

      const isValid = true; // Mock

      if (!isValid) {
        throw new Error('Backup verification failed');
      }

      context.log('Backup verification successful');

      return {
        success: true,
        durationMs: Date.now() - Date.now(),
        data: { verified: true }
      };
    } catch (error) {
      context.log(`Backup verification failed: ${error}`, 'error');
      // Critical alert
      // await alertOncall({ severity: 'critical', message: 'Backup verification failed', details: error });
      throw error;
    }
  }
});

/**
 * Job 5: Daily Log Rotation
 * Runs every day at midnight UTC
 */
scheduler.register({
  id: 'daily-log-rotation',
  name: 'Daily Log Rotation',
  description: 'Rotates and archives application logs',
  schedule: '0 0 * * *', // Cron: Every day at midnight
  timeout: 120000, // 2 minutes
  handler: async (context) => {
    context.log('Starting log rotation');

    try {
      // Rotate logs older than 30 days
      context.log('Rotating old logs...');
      // const rotatedCount = await rotateLogs({ retentionDays: 30 });

      const rotatedCount = 25; // Mock

      context.log(`Log rotation complete: ${rotatedCount} files rotated`);

      return {
        success: true,
        durationMs: Date.now() - Date.now(),
        data: { rotatedCount },
        metrics: {
          filesRotated: rotatedCount
        }
      };
    } catch (error) {
      context.log(`Log rotation failed: ${error}`, 'error');
      throw error;
    }
  }
});

/**
 * Job 6: Weekly Security Scan
 * Runs every Monday at 3:00 AM UTC
 */
scheduler.register({
  id: 'weekly-security-scan',
  name: 'Weekly Security Scan',
  description: 'Performs comprehensive security vulnerability scan',
  schedule: '0 3 * * 1', // Cron: Every Monday at 3:00 AM
  timeout: 1800000, // 30 minutes
  retry: {
    maxAttempts: 2,
    delayMs: 300000
  },
  handler: async (context) => {
    context.log('Starting security scan');

    try {
      // Run dependency audit
      context.log('Running dependency audit...');
      // const auditResults = await runDependencyAudit();

      // Check for vulnerable dependencies
      const vulnerabilities = 0; // Mock

      if (vulnerabilities > 0) {
        context.log(`Found ${vulnerabilities} vulnerabilities`, 'warn');
        // await notifySecurityTeam({ vulnerabilities });
      }

      context.log('Security scan complete');

      return {
        success: true,
        durationMs: Date.now() - Date.now(),
        data: { vulnerabilities },
        metrics: {
          vulnerabilitiesFound: vulnerabilities
        }
      };
    } catch (error) {
      context.log(`Security scan failed: ${error}`, 'error');
      throw error;
    }
  }
});

/**
 * Job 7: Monthly Metrics Aggregation
 * Runs on the 1st of every month at 1:00 AM UTC
 */
scheduler.register({
  id: 'monthly-metrics-aggregation',
  name: 'Monthly Metrics Aggregation',
  description: 'Aggregates and archives monthly performance metrics',
  schedule: '0 1 1 * *', // Cron: 1st of every month at 1:00 AM
  timeout: 600000, // 10 minutes
  handler: async (context) => {
    context.log('Starting monthly metrics aggregation');

    try {
      // Aggregate metrics
      context.log('Aggregating metrics...');
      // const metrics = await aggregateMonthlyMetrics();

      // Store aggregated metrics
      context.log('Storing aggregated metrics...');
      // await storeAggregatedMetrics(metrics);

      context.log('Metrics aggregation complete');

      return {
        success: true,
        durationMs: Date.now() - Date.now(),
        data: { aggregated: true }
      };
    } catch (error) {
      context.log(`Metrics aggregation failed: ${error}`, 'error');
      throw error;
    }
  }
});

// Start the scheduler
scheduler.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping scheduler...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping scheduler...');
  scheduler.stop();
  process.exit(0);
});

// Export scheduler for external control
export { scheduler };
