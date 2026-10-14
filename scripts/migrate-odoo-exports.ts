import { createClient } from '@libsql/client';
import { migrateOdooExports } from '../db/odooExportMigration';
const url = process.env.TURSO_DATABASE_URL;
if (!url) throw new Error('TURSO_DATABASE_URL is required');
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
migrateOdooExports(db).then(()=>console.log('Odoo export persistence ready')).catch(()=>{console.error('Migration failed');process.exitCode=1;}).finally(()=>db.close());
