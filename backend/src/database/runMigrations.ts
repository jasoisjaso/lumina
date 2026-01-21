import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function runMigrations() {
  console.log('Attempting to run database migrations...');
  try {
    const command = '/app/node_modules/.bin/knex migrate:latest';
    console.log(`Executing migration command: ${command}`);

    const { stdout, stderr } = await execPromise(command, { cwd: '/app' });

    console.log('Migrations stdout:', stdout);
    if (stderr) {
      console.warn('Migrations stderr:', stderr);
    }
    
    console.log('Database migrations process completed.');
  } catch (error) {
    console.error('ERROR: Failed to run database migrations.', error);
    process.exit(1);
  }
}
