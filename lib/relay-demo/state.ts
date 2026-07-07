import 'server-only';
import fs from 'fs';
import path from 'path';
import { db as siteDb, newId } from '../db';

export type TriageLevel = 'emergent' | 'urgent' | 'routine';

export type RelayPatient = {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  last_initial: string;
  mrn: string;
  room: string;
  room_number: string;
  unit: string;
  floor: string;
  age: number;
  sex: string;
  diagnosis: string;
  fall_risk: boolean;
  npo: boolean;
  infection_precautions: string | null;
  primary_language: string;
  language_label: string;
  cultural_preferences: string | null;
  preferences: string[];
  visitor_info: { name: string; relation: string; phone: string }[];
  dob: string;
};

export type RelayCall = RelayPatient & {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_mrn: string;
  timestamp: string;
  resolved_at: string | null;
  assigned_at: string | null;
  arrived_at: string | null;
  status: string;
  triage_level: TriageLevel;
  assigned_provider: string | null;
  wait_time_seconds: number;
  transcript_original: string;
  transcript_english: string | null;
  language_detected: string;
  ai_summary: string;
  confidence_score: number;
  keywords_detected: string[];
  shift: string;
  resolution: string | null;
  outcome: string | null;
  patient_rating: number | null;
};

export const providers = ['Miko R.', 'Jessica T.', 'Carlos M.', 'Sarah K.', 'DeShawn B.', 'Ana M.', 'Tyler W.'];

const schema = `
CREATE TABLE IF NOT EXISTS relay_demo_patients (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  last_initial TEXT,
  mrn TEXT,
  room TEXT,
  unit TEXT,
  floor TEXT,
  age INTEGER,
  sex TEXT,
  diagnosis TEXT,
  fall_risk INTEGER DEFAULT 0,
  npo INTEGER DEFAULT 0,
  infection_precautions TEXT,
  primary_language TEXT,
  language_label TEXT,
  cultural_preferences TEXT,
  preferences_json TEXT,
  visitor_info_json TEXT,
  dob TEXT
);
CREATE TABLE IF NOT EXISTS relay_demo_calls (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  resolved_at TEXT,
  assigned_at TEXT,
  arrived_at TEXT,
  status TEXT NOT NULL,
  triage_level TEXT NOT NULL,
  assigned_provider TEXT,
  wait_time_seconds INTEGER DEFAULT 0,
  transcript_original TEXT,
  transcript_english TEXT,
  language_detected TEXT,
  language_label TEXT,
  ai_summary TEXT,
  confidence_score REAL,
  keywords_json TEXT,
  shift TEXT,
  resolution TEXT,
  outcome TEXT,
  patient_rating INTEGER
);
CREATE TABLE IF NOT EXISTS relay_demo_messages (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  provider TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS relay_demo_instructions (
  id TEXT PRIMARY KEY,
  triage_level TEXT NOT NULL,
  condition_text TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
`;

const defaultPatients = [
  patientSeed('pat-401', 'Maria', 'Lopez', '2840401', '401', '4A', 67, 'F', 'Post-laparoscopic cholecystectomy (POD2)', false, false, null, 'es', 'Spanish', '1957-03-22', ['Family updates in Spanish']),
  patientSeed('pat-402', 'James', 'Patterson', '2840402', '402', '4A', 74, 'M', 'Congestive heart failure exacerbation', true, false, null, 'en', 'English', '1950-08-14', ['Water with no ice', 'Room temperature near 72F']),
  patientSeed('pat-403', 'Mei', 'Chen', '2840403', '403', '4A', 71, 'F', 'Right hip arthroplasty (POD1)', true, false, null, 'zh', 'Mandarin', '1953-11-05', ['Daughter Amy is primary interpreter']),
  patientSeed('pat-406', 'Roberto', 'Vargas', '2840406', '406', '4A', 62, 'M', 'Type 2 DM with hyperglycemic crisis', false, false, null, 'es', 'Spanish', '1962-12-03', ['Family visiting questions in Spanish']),
  patientSeed('pat-407', 'Helen', 'Sullivan', '2840407', '407', '4A', 83, 'F', 'Left femur fracture s/p ORIF', true, false, null, 'en', 'English', '1941-02-12', ['Responds better to Helen', 'Keep an extra blanket nearby']),
  patientSeed('pat-408', 'Priya', 'Nair', '2840408', '408', '4A', 39, 'F', 'Post-cesarean section (POD2)', false, false, null, 'hi', 'Hindi', '1985-09-22', ['Vegetarian meals', 'Husband joins care discussions']),
  patientSeed('pat-409', 'Antoine', 'Bouchard', '2840409', '409', '4A', 51, 'M', 'CABG x3 (POD3)', true, false, 'Contact precautions', 'fr', 'French', '1973-06-17', ['Wife Claire is primary contact']),
  patientSeed('pat-411', 'Sung-Jin', 'Kim', '2840411', '411', '4A', 55, 'M', 'Acute pancreatitis (moderate)', false, true, null, 'ko', 'Korean', '1969-03-08', ['Wife handles communication']),
  patientSeed('pat-412', 'Fatima', 'Al-Hassan', '2840412', '412', '4A', 34, 'F', 'Sickle cell crisis - vaso-occlusive episode', false, false, null, 'ar', 'Arabic', '1990-08-14', ['Female providers preferred', 'Halal diet']),
  patientSeed('pat-425', 'Luciana', 'Reyes', '2840425', '425', '4B', 55, 'F', 'Sepsis - UTI source (improved)', true, false, 'Contact precautions', 'pt', 'Portuguese', '1969-03-29', ['Needs assistance before ambulating']),
  patientSeed('pat-426', 'Winston', 'Green', '2840426', '426', '4B', 81, 'M', 'Hip fracture s/p hemiarthroplasty (POD2)', true, false, null, 'en', 'English', '1943-08-11', ['DNR/DNI advance directives on file']),
  patientSeed('pat-430', 'Eduardo', 'Pereira', '2840430', '430', '4B', 53, 'M', 'Acute pancreatitis - biliary (moderate)', false, true, null, 'es', 'Spanish', '1971-09-17', ['Wife Rosa handles medication questions']),
  patientSeed('pat-431', 'Eleanor', 'Brooks', '2840431', '431', '4B', 77, 'F', 'Left femur fracture s/p ORIF', true, false, null, 'en', 'English', '1947-10-03', ['Uses hearing aids', 'Daughter Maya is proxy']),
  patientSeed('pat-432', 'Caleb', 'Nguyen', '2840432', '432', '4B', 63, 'M', 'CABG x3 (POD3)', true, false, 'Contact precautions', 'vi', 'Vietnamese', '1961-04-16', ['Son Minh joins discharge teaching']),
  patientSeed('pat-433', 'Imani', 'Carter', '2840433', '433', '4B', 31, 'F', 'Sickle cell crisis - vaso-occlusive episode', false, false, null, 'en', 'English', '1993-01-28', ['Prefers warm compresses during pain flares']),
  patientSeed('pat-434', 'Mateo', 'Rios', '2840434', '434', '4B', 56, 'M', 'Acute pancreatitis (moderate)', false, true, null, 'es', 'Spanish', '1968-06-21', ['Wife Elena handles medication questions']),
  patientSeed('pat-435', 'Valeria', 'Morales', '2840435', '435', '4B', 69, 'F', 'Type 2 DM with hyperglycemic crisis', false, false, null, 'es', 'Spanish', '1955-02-09', ['Written instructions in Spanish']),
  patientSeed('pat-436', 'Anika', 'Shah', '2840436', '436', '4B', 36, 'F', 'Post-cesarean section (POD2)', false, false, null, 'hi', 'Hindi', '1988-12-19', ['Vegetarian meals']),
  patientSeed('pat-437', 'Nathaniel', 'Price', '2840437', '437', '4B', 76, 'M', 'Congestive heart failure exacerbation', true, false, null, 'en', 'English', '1948-05-11', ['Large-print discharge paperwork']),
  patientSeed('pat-438', 'Grace', 'Okafor', '2840438', '438', '4B', 52, 'F', 'Community-acquired pneumonia', false, false, 'Droplet precautions', 'en', 'English', '1972-09-02', ['Sister Chika updated after rounds']),
  patientSeed('pat-demo-001', 'Alex', 'Demo', '9999001', '401', '4A', 45, 'M', 'Demo patient', false, false, null, 'en', 'English', '1980-01-01', []),
];

const defaultInstructions = [
  ['emergent', 'Any chest pain, shortness of breath, fall, bleeding, seizure activity, or self-harm statement'],
  ['emergent', 'SOS button on patient app is pressed'],
  ['urgent', 'Moderate or increasing pain, nausea, new dizziness, IV issue, or medication request'],
  ['urgent', 'Routine call not responded to within 5 minutes'],
  ['routine', 'Comfort requests, food and beverage questions, family communication, room environment'],
] as const;

const pools: Record<string, string[]> = {
  chest: ['pat-407', 'pat-409', 'pat-432', 'pat-438'],
  fall: ['pat-425', 'pat-426', 'pat-431', 'pat-437'],
  abdominalPain: ['pat-403', 'pat-412', 'pat-433'],
  sicklePain: ['pat-412', 'pat-433'],
  npo: ['pat-411', 'pat-430', 'pat-434'],
  spanishRoutine: ['pat-406', 'pat-401', 'pat-435'],
  comfort: ['pat-408', 'pat-436'],
};

let initialized = false;
let localAdapter: Awaited<ReturnType<typeof makeLocalSqlite>> | null = null;

async function relayDb() {
  if (process.env.POSTGRES_URL || process.env.DATABASE_URL) return siteDb();
  if (!localAdapter) localAdapter = await makeLocalSqlite();
  return localAdapter;
}

async function makeLocalSqlite() {
  const { DatabaseSync } = await import('node:sqlite');
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const database = new DatabaseSync(path.join(dir, 'relay-demo.db'));
  database.exec('PRAGMA journal_mode = WAL');
  return {
    exec: async (sql: string) => { database.exec(sql); },
    all: async <T = Record<string, any>>(sql: string, params: any[] = []) => database.prepare(sql).all(...params) as T[],
    get: async <T = Record<string, any>>(sql: string, params: any[] = []) => database.prepare(sql).get(...params) as T | undefined,
    run: async (sql: string, params: any[] = []) => { database.prepare(sql).run(...params); },
  };
}

export async function ensureRelayDemoState() {
  const database = await relayDb();
  if (!initialized) {
    await database.exec(schema);
    initialized = true;
  }

  for (const p of defaultPatients) {
    const exists = await database.get('SELECT id FROM relay_demo_patients WHERE id = ?', [p.id]);
    if (!exists) await insertPatient(p);
  }

  const instructionCount = await database.get<{ n: number }>('SELECT COUNT(*) as n FROM relay_demo_instructions');
  if (!Number(instructionCount?.n || 0)) {
    for (let i = 0; i < defaultInstructions.length; i += 1) {
      const [triage_level, condition_text] = defaultInstructions[i];
      await database.run(
        'INSERT INTO relay_demo_instructions (id, triage_level, condition_text, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
        [newId(), triage_level, condition_text, i + 1, nowIso()],
      );
    }
  }

  const callCount = await database.get<{ n: number }>('SELECT COUNT(*) as n FROM relay_demo_calls');
  if (!Number(callCount?.n || 0)) await resetDemoCalls();
}

async function insertPatient(p: RelayPatient) {
  const database = await relayDb();
  await database.run(
    `INSERT INTO relay_demo_patients
     (id, first_name, last_name, last_initial, mrn, room, unit, floor, age, sex, diagnosis, fall_risk, npo, infection_precautions, primary_language, language_label, cultural_preferences, preferences_json, visitor_info_json, dob)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.id, p.first_name, p.last_name, p.last_initial, p.mrn, p.room, p.unit, p.floor, p.age, p.sex, p.diagnosis,
      p.fall_risk ? 1 : 0, p.npo ? 1 : 0, p.infection_precautions, p.primary_language, p.language_label,
      p.cultural_preferences, JSON.stringify(p.preferences), JSON.stringify(p.visitor_info), p.dob,
    ],
  );
}

export async function resetDemoCalls() {
  const database = await relayDb();
  await database.run('DELETE FROM relay_demo_messages');
  await database.run('DELETE FROM relay_demo_calls');
  const fresh = buildFreshCalls();
  for (const call of fresh) await insertCall(call);
  for (const call of buildResolvedCalls()) await insertCall(call);
  for (const call of buildHistoricalCalls()) await insertCall(call);
  return fresh;
}

export async function listCalls(url: URL) {
  await ensureRelayDemoState();
  const rows = await queryCalls(url);
  return rows.map(mapCall);
}

export async function activeCalls() {
  await ensureRelayDemoState();
  const database = await relayDb();
  const rows = await database.all(`SELECT c.*, ${patientSelect('p')} FROM relay_demo_calls c JOIN relay_demo_patients p ON p.id = c.patient_id WHERE c.status != ? ORDER BY c.timestamp DESC`, ['resolved']);
  return rows.map(mapCall);
}

export async function getCall(id: string) {
  await ensureRelayDemoState();
  const database = await relayDb();
  const row = await database.get(`SELECT c.*, ${patientSelect('p')} FROM relay_demo_calls c JOIN relay_demo_patients p ON p.id = c.patient_id WHERE c.id = ?`, [id]);
  return row ? mapCall(row) : null;
}

export async function upsertCall(payload: any) {
  await ensureRelayDemoState();
  const database = await relayDb();
  const id = String(payload.id || newId());
  const existing = await getCall(id);
  const patient = await getPatient(String(payload.patient_id || existing?.patient_id || 'pat-demo-001'));
  const triage = normalizeTriage(payload.triage_level || existing?.triage_level || classify(String(payload.transcript_english || payload.transcript_original || '')).triage_level);
  const now = nowIso();
  const call: RelayCall = {
    ...(patient || defaultPatients[0]),
    id,
    patient_id: patient?.id || 'pat-demo-001',
    patient_name: patient?.name || 'Patient',
    patient_mrn: patient?.mrn || '',
    timestamp: existing?.timestamp || now,
    resolved_at: existing?.resolved_at || null,
    assigned_at: existing?.assigned_at || null,
    arrived_at: existing?.arrived_at || null,
    status: payload.status || existing?.status || 'incoming',
    triage_level: triage,
    assigned_provider: payload.assigned_provider ?? existing?.assigned_provider ?? null,
    wait_time_seconds: existing?.wait_time_seconds || 0,
    transcript_original: String(payload.transcript_original || existing?.transcript_original || ''),
    transcript_english: payload.transcript_english ?? existing?.transcript_english ?? null,
    language_detected: payload.language_detected || existing?.language_detected || patient?.primary_language || 'en',
    language_label: payload.language_label || existing?.language_label || patient?.language_label || 'English',
    ai_summary: payload.ai_summary || existing?.ai_summary || classify(String(payload.transcript_english || payload.transcript_original || '')).summary,
    confidence_score: Number(payload.confidence_score || existing?.confidence_score || 0.86),
    keywords_detected: Array.isArray(payload.keywords_detected) ? payload.keywords_detected : existing?.keywords_detected || [],
    shift: existing?.shift || currentShift(),
    resolution: existing?.resolution || null,
    outcome: existing?.outcome || null,
    patient_rating: existing?.patient_rating || null,
  };
  if (existing) {
    await updateCall(id, call);
  } else {
    await insertCall(call);
  }
  return getCall(id);
}

export async function patchCall(id: string, patch: any) {
  await ensureRelayDemoState();
  const existing = await getCall(id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  if (patch.assigned_provider && !existing.assigned_at) next.assigned_at = nowIso();
  if (patch.status === 'in_progress' && !existing.arrived_at) next.arrived_at = nowIso();
  if (patch.status === 'resolved' && !existing.resolved_at) next.resolved_at = nowIso();
  await updateCall(id, next);
  return getCall(id);
}

export async function rateCall(id: string, rating: number) {
  return patchCall(id, { patient_rating: rating });
}

export async function listMessages(callId: string) {
  await ensureRelayDemoState();
  const database = await relayDb();
  return database.all('SELECT id, call_id, sender, provider, content, created_at, created_at as timestamp FROM relay_demo_messages WHERE call_id = ? ORDER BY created_at ASC', [callId]);
}

export async function addMessage(callId: string, sender: string, content: string, provider?: string | null) {
  await ensureRelayDemoState();
  const database = await relayDb();
  const row = { id: newId(), call_id: callId, sender, provider: provider || null, content, created_at: nowIso() };
  await database.run(
    'INSERT INTO relay_demo_messages (id, call_id, sender, provider, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [row.id, row.call_id, row.sender, row.provider, row.content, row.created_at],
  );
  return { ...row, timestamp: row.created_at };
}

export async function listInstructions() {
  await ensureRelayDemoState();
  const database = await relayDb();
  return database.all('SELECT id, triage_level, condition_text, sort_order, created_at FROM relay_demo_instructions ORDER BY sort_order ASC, created_at ASC');
}

export async function addInstruction(level: string, text: string) {
  await ensureRelayDemoState();
  const database = await relayDb();
  const max = await database.get<{ m: number }>('SELECT MAX(sort_order) as m FROM relay_demo_instructions');
  const row = { id: newId(), triage_level: normalizeTriage(level), condition_text: text.trim(), sort_order: Number(max?.m || 0) + 1, created_at: nowIso() };
  await database.run(
    'INSERT INTO relay_demo_instructions (id, triage_level, condition_text, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
    [row.id, row.triage_level, row.condition_text, row.sort_order, row.created_at],
  );
  return row;
}

export async function deleteInstruction(id: string) {
  await ensureRelayDemoState();
  const database = await relayDb();
  await database.run('DELETE FROM relay_demo_instructions WHERE id = ?', [id]);
  return { ok: true };
}

export async function listPatients() {
  await ensureRelayDemoState();
  const database = await relayDb();
  const rows = await database.all('SELECT * FROM relay_demo_patients ORDER BY unit, room');
  return rows.map(mapPatient);
}

export async function getPatient(id: string) {
  await ensureRelayDemoState();
  const database = await relayDb();
  const row = await database.get('SELECT * FROM relay_demo_patients WHERE id = ?', [id]);
  return row ? mapPatient(row) : null;
}

export async function loginPatient(lastName: string, dob: string) {
  await ensureRelayDemoState();
  const database = await relayDb();
  const row = await database.get('SELECT * FROM relay_demo_patients WHERE LOWER(last_name) = LOWER(?) AND dob = ? LIMIT 1', [lastName.trim(), dob.trim()]);
  return row ? mapPatient(row) : null;
}

export async function updatePatientName(id: string, firstName: string) {
  await ensureRelayDemoState();
  const database = await relayDb();
  await database.run('UPDATE relay_demo_patients SET first_name = ? WHERE id = ?', [firstName.trim(), id]);
  return getPatient(id);
}

export async function addPreference(patientId: string, text: string) {
  const patient = await getPatient(patientId);
  if (!patient) return null;
  const database = await relayDb();
  const preferences = [...patient.preferences, text].filter(Boolean);
  await database.run('UPDATE relay_demo_patients SET preferences_json = ? WHERE id = ?', [JSON.stringify(preferences), patientId]);
  return { ok: true };
}

export async function handleEvent(event: string, payload: any) {
  await ensureRelayDemoState();
  const callId = String(payload.callId || payload.id || '');
  if (event === 'new-call') {
    return upsertCall({
      id: callId || newId(),
      patient_id: payload.patientId || payload.patient_id || 'pat-demo-001',
      status: 'incoming',
      transcript_original: '',
      triage_level: 'routine',
      ai_summary: 'Patient call started. Awaiting transcript.',
    });
  }
  if (event === 'call-transcript-update') {
    const existing = await getCall(callId);
    if (!existing) return null;
    return patchCall(callId, {
      transcript_original: payload.originalText || payload.text || existing.transcript_original,
      transcript_english: payload.originalText ? payload.text : existing.transcript_english,
      language_detected: payload.language || existing.language_detected,
      language_label: payload.languageLabel || existing.language_label,
    });
  }
  if (event === 'call-processed') return patchCall(callId, payload);
  if (event === 'call-accepted') return patchCall(callId, { status: 'accepted', assigned_provider: payload.provider || payload.assigned_provider || 'Provider' });
  if (event === 'call-arrived') return patchCall(callId, { status: 'in_progress' });
  if (event === 'call-resolved') return patchCall(callId, { status: 'resolved', resolution: payload.resolution || 'Resolved at bedside' });
  if (event === 'sos-emergency') return patchCall(callId, { status: 'incoming', triage_level: 'emergent', ai_summary: 'SOS button pressed in patient app. Immediate response required.' });
  if (event === 'patient-message') return addMessage(callId, 'patient', String(payload.content || ''));
  if (event === 'provider-message') return addMessage(callId, 'provider', String(payload.content || ''), payload.provider || 'Provider');
  return { ok: true };
}

export function classify(transcript: string) {
  const lower = transcript.toLowerCase();
  if (/chest|breath|can't breathe|cannot breathe|fall|fell|bleeding|seizure|suicide|sos/.test(lower)) {
    return {
      triage_level: 'emergent' as TriageLevel,
      confidence: 0.92,
      summary: 'Patient report includes high-acuity symptoms or safety risk. Immediate response required.',
      keywords_detected: ['emergent', 'safety'],
      suggested_response: 'Go to bedside immediately and notify charge nurse if needed.',
      suggested_equipment: ['vitals kit'],
      english_translation: transcript,
    };
  }
  if (/pain|medication|nausea|vomit|dizzy|iv|worse/.test(lower)) {
    return {
      triage_level: 'urgent' as TriageLevel,
      confidence: 0.86,
      summary: 'Patient reports symptoms requiring prompt clinical assessment.',
      keywords_detected: ['urgent', 'assessment'],
      suggested_response: 'Assess symptoms and administer ordered PRN support when appropriate.',
      suggested_equipment: ['medication scanner'],
      english_translation: transcript,
    };
  }
  return {
    triage_level: 'routine' as TriageLevel,
    confidence: 0.82,
    summary: 'Patient is requesting routine comfort or information support.',
    keywords_detected: ['comfort', 'routine'],
    suggested_response: 'Respond when available and document outcome.',
    suggested_equipment: [],
    english_translation: transcript,
  };
}

async function queryCalls(url: URL) {
  const database = await relayDb();
  const rows = await database.all(`SELECT c.*, ${patientSelect('p')} FROM relay_demo_calls c JOIN relay_demo_patients p ON p.id = c.patient_id ORDER BY c.timestamp DESC`);
  const status = url.searchParams.get('status');
  const triage = url.searchParams.get('triage');
  const unit = url.searchParams.get('unit');
  const shift = url.searchParams.get('shift');
  const limit = Number(url.searchParams.get('limit') || 200);
  return rows
    .filter((row: any) => !status || row.status === status)
    .filter((row: any) => !triage || row.triage_level === triage)
    .filter((row: any) => !unit || row.unit === unit)
    .filter((row: any) => !shift || row.shift === shift)
    .slice(0, limit);
}

async function insertCall(call: RelayCall) {
  const database = await relayDb();
  await database.run(
    `INSERT INTO relay_demo_calls
     (id, patient_id, timestamp, resolved_at, assigned_at, arrived_at, status, triage_level, assigned_provider, wait_time_seconds, transcript_original, transcript_english, language_detected, language_label, ai_summary, confidence_score, keywords_json, shift, resolution, outcome, patient_rating)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      call.id, call.patient_id, call.timestamp, call.resolved_at, call.assigned_at, call.arrived_at, call.status, call.triage_level,
      call.assigned_provider, call.wait_time_seconds, call.transcript_original, call.transcript_english, call.language_detected,
      call.language_label, call.ai_summary, call.confidence_score, JSON.stringify(call.keywords_detected), call.shift, call.resolution,
      call.outcome, call.patient_rating,
    ],
  );
}

async function updateCall(id: string, call: RelayCall) {
  const database = await relayDb();
  await database.run(
    `UPDATE relay_demo_calls
     SET patient_id = ?, timestamp = ?, resolved_at = ?, assigned_at = ?, arrived_at = ?, status = ?, triage_level = ?, assigned_provider = ?,
         wait_time_seconds = ?, transcript_original = ?, transcript_english = ?, language_detected = ?, language_label = ?, ai_summary = ?,
         confidence_score = ?, keywords_json = ?, shift = ?, resolution = ?, outcome = ?, patient_rating = ?
     WHERE id = ?`,
    [
      call.patient_id, call.timestamp, call.resolved_at, call.assigned_at, call.arrived_at, call.status, call.triage_level,
      call.assigned_provider, call.wait_time_seconds, call.transcript_original, call.transcript_english, call.language_detected,
      call.language_label, call.ai_summary, call.confidence_score, JSON.stringify(call.keywords_detected), call.shift, call.resolution,
      call.outcome, call.patient_rating, id,
    ],
  );
}

function buildFreshCalls() {
  const specs: Array<[string, string, TriageLevel, string, string | null, number, string, string | null, string, string[]]> = [
    ['live-chest', pick('chest'), 'emergent', 'incoming', null, 18, 'I have really bad chest pain and I cannot breathe properly.', null, 'Patient reporting severe chest pain and shortness of breath. Immediate bedside assessment required.', ['chest pain', 'shortness of breath']],
    ['live-fall', pick('fall'), 'emergent', 'incoming', null, 51, 'I tried to get up and I fell. My hip hurts.', null, 'Fall-risk patient reports fall with possible hip injury and dizziness.', ['fall', 'dizziness', 'hip pain']],
    ['live-pain', pick('abdominalPain'), 'urgent', 'accepted', 'Miko R.', 96, 'My stomach pain is getting worse. I need something for it.', null, 'Patient reports worsening abdominal pain and requests analgesic.', ['pain', 'analgesic']],
    ['live-sickle', pick('sicklePain'), 'urgent', 'accepted', 'Jessica T.', 128, 'I need pain medication. The pain is very severe, eight out of ten.', 'I need pain medication. The pain is very severe, eight out of ten.', 'Patient requesting IV pain medication. Self-reported pain 8/10.', ['pain', 'medication']],
    ['live-npo', pick('npo'), 'routine', 'pending', null, 74, 'Can I get some ice chips? Also when can I eat again?', null, 'NPO patient requesting ice chips and asking about meal schedule.', ['npo', 'education']],
    ['live-spanish', pick('spanishRoutine'), 'routine', 'incoming', null, 39, 'Necesito agua por favor. A que hora puede visitarme mi familia?', 'I need water please. What time can my family visit me?', 'Spanish-speaking patient requesting water and visitor information.', ['water', 'family']],
    ['live-comfort', pick('comfort'), 'routine', 'in_progress', 'DeShawn B.', 126, 'Can you raise my bed a little? I also need another pillow.', null, 'Patient requesting bed adjustment and extra pillow.', ['comfort', 'positioning']],
  ];
  return specs.map(callFromSpec);
}

function buildResolvedCalls() {
  const summaries: Array<[string, TriageLevel, number]> = [
    ['Resolved bathroom assistance for fall-risk patient. Bed alarm reset.', 'routine', 92],
    ['Administered ordered PRN pain medication after assessment.', 'urgent', 184],
    ['Repositioned patient and changed linens.', 'routine', 121],
    ['Respiratory therapy notified for shortness of breath. Oxygen increased per order.', 'emergent', 66],
    ['Interpreter-assisted family update completed.', 'routine', 156],
    ['Evaluated dizziness complaint. Vitals stable, provider notified.', 'urgent', 201],
    ['Delivered water after diet order confirmed.', 'routine', 54],
    ['Assisted patient to commode with two-person assist.', 'urgent', 139],
    ['Changed IV pump battery and confirmed infusion running.', 'routine', 111],
    ['Escalated chest pressure complaint to rapid response workflow.', 'emergent', 48],
  ];
  return summaries.map(([summary, triage, wait], index) => {
    const patient = defaultPatients[index % defaultPatients.length];
    const secondsAgo = 1800 + index * 3900;
    const call = callFromSpec([`resolved-${index + 1}`, patient.id, triage, 'resolved', providers[index % providers.length], secondsAgo, summary, null, summary, [triage, 'resolved']]);
    call.resolved_at = nowMinus(secondsAgo - wait - 240);
    call.assigned_at = nowMinus(secondsAgo - 30);
    call.arrived_at = nowMinus(secondsAgo - wait);
    call.wait_time_seconds = wait;
    call.resolution = summary;
    call.outcome = index % 4 === 0 ? 'Escalated to charge nurse' : 'Resolved at bedside';
    return call;
  });
}

function buildHistoricalCalls() {
  return Array.from({ length: 84 }, (_, i) => {
    const patient = defaultPatients[i % defaultPatients.length];
    const triage = (i % 10 === 0 ? 'emergent' : i % 3 === 0 ? 'urgent' : 'routine') as TriageLevel;
    const wait = triage === 'emergent' ? 35 + (i % 6) * 9 : triage === 'urgent' ? 105 + (i % 8) * 22 : 160 + (i % 10) * 31;
    const ts = new Date();
    ts.setDate(ts.getDate() - (1 + (i % 30)));
    ts.setHours((i * 3) % 24, (i * 7) % 60, 0, 0);
    const call = callFromSpec([`hist-${i + 1}`, patient.id, triage, 'resolved', providers[i % providers.length], Math.max(60, Math.floor((Date.now() - +ts) / 1000)), demoTranscript(triage), null, demoSummary(triage, patient.fall_risk), [triage, patient.language_label.toLowerCase()]]);
    call.timestamp = ts.toISOString();
    call.resolved_at = new Date(+ts + (wait + 240) * 1000).toISOString();
    call.assigned_at = new Date(+ts + 30 * 1000).toISOString();
    call.arrived_at = new Date(+ts + wait * 1000).toISOString();
    call.wait_time_seconds = wait;
    call.shift = ((i * 3) % 24) >= 19 || ((i * 3) % 24) < 7 ? 'night' : 'day';
    call.resolution = call.ai_summary;
    call.outcome = 'Resolved at bedside';
    return call;
  });
}

function callFromSpec(spec: [string, string, TriageLevel, string, string | null, number, string, string | null, string, string[]]): RelayCall {
  const [suffix, patientId, triage, status, provider, secondsAgo, original, english, summary, keywords] = spec;
  const p = defaultPatients.find((row) => row.id === patientId) || defaultPatients[0];
  return {
    ...p,
    id: `call-${suffix}-${Date.now().toString(36)}`,
    patient_id: p.id,
    patient_name: p.name,
    patient_mrn: p.mrn,
    timestamp: nowMinus(secondsAgo),
    resolved_at: null,
    assigned_at: provider ? nowMinus(Math.max(5, secondsAgo - 30)) : null,
    arrived_at: status === 'in_progress' ? nowMinus(Math.max(2, secondsAgo - 90)) : null,
    status,
    triage_level: triage,
    assigned_provider: provider,
    wait_time_seconds: secondsAgo,
    transcript_original: original,
    transcript_english: english,
    language_detected: p.primary_language,
    language_label: p.language_label,
    ai_summary: summary,
    confidence_score: triage === 'emergent' ? 0.94 : triage === 'urgent' ? 0.88 : 0.84,
    keywords_detected: keywords,
    shift: secondsAgo % 3 === 0 ? 'night' : 'day',
    resolution: null,
    outcome: null,
    patient_rating: null,
  };
}

function patientSeed(id: string, first: string, last: string, mrn: string, room: string, unit: string, age: number, sex: string, diagnosis: string, fallRisk: boolean, npo: boolean, infection: string | null, language: string, label: string, dob: string, preferences: string[]): RelayPatient {
  return {
    id,
    name: `${first} ${last}`,
    first_name: first,
    last_name: last,
    last_initial: last[0],
    mrn,
    room,
    room_number: room,
    unit,
    floor: unit === 'ICU' ? '2' : '4',
    age,
    sex,
    diagnosis,
    fall_risk: fallRisk,
    npo,
    infection_precautions: infection,
    primary_language: language,
    language_label: label,
    cultural_preferences: preferences.join('; '),
    preferences,
    visitor_info: [{ name: `${first} family`, relation: 'Family', phone: `404-555-${room.padStart(4, '0')}` }],
    dob,
  };
}

function mapPatient(row: any): RelayPatient {
  const first = row.first_name || row.name?.split(' ')[0] || 'Patient';
  const last = row.last_name || 'Demo';
  return {
    id: row.p_id || row.id,
    name: `${first} ${last}`,
    first_name: first,
    last_name: last,
    last_initial: row.last_initial || last[0],
    mrn: row.mrn || '',
    room: row.room || row.room_number || '',
    room_number: row.room || row.room_number || '',
    unit: row.unit || '',
    floor: row.floor || '',
    age: Number(row.age || 0),
    sex: row.sex || '',
    diagnosis: row.diagnosis || '',
    fall_risk: bool(row.fall_risk),
    npo: bool(row.npo),
    infection_precautions: row.infection_precautions || null,
    primary_language: row.primary_language || 'en',
    language_label: row.language_label || 'English',
    cultural_preferences: row.cultural_preferences || null,
    preferences: parseJson(row.preferences_json, []),
    visitor_info: parseJson(row.visitor_info_json, []),
    dob: row.dob || '',
  };
}

function patientSelect(alias: string) {
  return [
    'id', 'first_name', 'last_name', 'last_initial', 'mrn', 'room', 'unit', 'floor', 'age', 'sex', 'diagnosis',
    'fall_risk', 'npo', 'infection_precautions', 'primary_language', 'language_label', 'cultural_preferences',
    'preferences_json', 'visitor_info_json', 'dob',
  ].map((col) => `${alias}.${col} as ${col === 'id' ? 'p_id' : col}`).join(', ');
}

function mapCall(row: any): RelayCall {
  const p = mapPatient(row);
  return {
    ...p,
    id: row.id,
    patient_id: row.patient_id,
    patient_name: p.first_name,
    patient_mrn: p.mrn,
    timestamp: row.timestamp,
    resolved_at: row.resolved_at || null,
    assigned_at: row.assigned_at || null,
    arrived_at: row.arrived_at || null,
    status: row.status || 'pending',
    triage_level: normalizeTriage(row.triage_level),
    assigned_provider: row.assigned_provider || null,
    wait_time_seconds: Number(row.wait_time_seconds || 0),
    transcript_original: row.transcript_original || '',
    transcript_english: row.transcript_english || null,
    language_detected: row.language_detected || p.primary_language || 'en',
    language_label: row.language_label || p.language_label || 'English',
    ai_summary: row.ai_summary || '',
    confidence_score: Number(row.confidence_score || 0),
    keywords_detected: parseJson(row.keywords_json, []),
    shift: row.shift || currentShift(),
    resolution: row.resolution || null,
    outcome: row.outcome || null,
    patient_rating: row.patient_rating == null ? null : Number(row.patient_rating),
  };
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function bool(value: any) {
  return value === true || value === 1 || value === '1';
}

function normalizeTriage(value: any): TriageLevel {
  return value === 'emergent' || value === 'urgent' || value === 'routine' ? value : 'routine';
}

function pick(poolName: string) {
  const ids = pools[poolName] || [poolName];
  return ids[Math.floor(Math.random() * ids.length)];
}

function nowIso() {
  return new Date().toISOString();
}

function nowMinus(seconds: number) {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

function currentShift() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 15) return 'day';
  if (hour >= 15 && hour < 23) return 'evening';
  return 'night';
}

function demoTranscript(triage: TriageLevel) {
  if (triage === 'emergent') return 'I feel dizzy and I have chest pressure.';
  if (triage === 'urgent') return 'My pain is getting worse and I need help.';
  return 'Can someone help me adjust my room and bring water?';
}

function demoSummary(triage: TriageLevel, fallRisk: boolean) {
  if (triage === 'emergent') return fallRisk ? 'Fall-risk patient with urgent safety complaint; immediate response indicated.' : 'Patient reports high-acuity symptoms requiring immediate assessment.';
  if (triage === 'urgent') return 'Patient reports increasing pain and requests clinical assessment.';
  return 'Patient requesting comfort assistance and routine support.';
}
