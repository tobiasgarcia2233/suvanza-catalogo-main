import { createClient } from '@libsql/client';
import { migrateOrderDeletion } from '../db/orderDeletionMigration';
const url = process.env.TURSO_DATABASE_URL;
if (!url) throw new Error('TURSO_DATABASE_URL is required');
const db = createClient({url, authToken:process.env.TURSO_AUTH_TOKEN});
migrateOrderDeletion(db).then(()=>console.log('Local order deletion schema ready')).catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.close());
