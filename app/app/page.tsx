import { db } from '@/lib/db';
import AppForm from '@/components/AppForm';
import Tracker from '@/components/Tracker';

export const dynamic = 'force-dynamic';

async function getSchema() {
  const d = await db();
  const row = await d.get<{ version: number; schema_json: string }>(
    'SELECT version, schema_json FROM survey_schema ORDER BY version DESC LIMIT 1'
  );
  if (!row) return { version: 0, schema: { title: 'RELAY Pilot Application', questions: [] } };
  return { version: row.version, schema: JSON.parse(row.schema_json) };
}

export default async function AppPage() {
  const { schema, version } = await getSchema();
  return (
    <>
      <Tracker />
      <AppForm schema={schema} version={version} />
    </>
  );
}
