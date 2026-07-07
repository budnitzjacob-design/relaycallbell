import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path?: string[] }> };

type DemoCall = {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_mrn: string;
  mrn: string;
  room_number: string;
  room: string;
  unit: string;
  floor: string;
  age: number;
  sex: string;
  diagnosis: string;
  fall_risk: boolean;
  infection_precautions: string | null;
  npo: boolean;
  cultural_preferences: string;
  preferences: string[];
  visitor_info: { name: string; relation: string; phone: string }[];
  timestamp: string;
  resolved_at?: string | null;
  assigned_at?: string | null;
  arrived_at?: string | null;
  status: string;
  triage_level: 'emergent' | 'urgent' | 'routine';
  assigned_provider: string | null;
  wait_time_seconds: number;
  transcript_original: string;
  transcript_english: string | null;
  language_detected: string;
  language_label: string;
  ai_summary: string;
  confidence_score: number;
  keywords_detected: string[];
  shift: string;
  resolution?: string | null;
  outcome?: string | null;
};

const providers = ['Miko R.', 'Jessica T.', 'Carlos M.', 'Sarah K.', 'DeShawn B.', 'Ana M.', 'Tyler W.'];

type DemoSpec = readonly [
  string,
  string,
  DemoCall['triage_level'],
  string,
  string | null,
  number,
  string,
  string | null,
  string,
  readonly string[],
];

const patients = [
  { id: 'pat-403', name: 'Eleanor M.', mrn: '2840403', room: '403', unit: '4A', floor: '4', age: 72, sex: 'F', diagnosis: 'Small bowel obstruction, NPO', fallRisk: true, npo: true, infection: null, language: 'en', label: 'English', preferences: ['Warm blankets before sleep', 'Knock before entering'] },
  { id: 'pat-406', name: 'Luis G.', mrn: '2840406', room: '406', unit: '4A', floor: '4', age: 61, sex: 'M', diagnosis: 'CHF exacerbation, diuresis', fallRisk: true, npo: false, infection: null, language: 'es', label: 'Spanish', preferences: ['Family updates in Spanish'] },
  { id: 'pat-407', name: 'Nadia P.', mrn: '2840407', room: '407', unit: '4A', floor: '4', age: 58, sex: 'F', diagnosis: 'Post-op hip fracture repair', fallRisk: true, npo: false, infection: 'Contact precautions', language: 'en', label: 'English', preferences: ['Prefers lights dimmed'] },
  { id: 'pat-411', name: 'Harold S.', mrn: '2840411', room: '411', unit: '4A', floor: '4', age: 80, sex: 'M', diagnosis: 'Pneumonia, oxygen 2L NC', fallRisk: true, npo: false, infection: 'Droplet precautions', language: 'en', label: 'English', preferences: ['TV volume low'] },
  { id: 'pat-412', name: 'Fatima A.', mrn: '2840412', room: '412', unit: '4A', floor: '4', age: 34, sex: 'F', diagnosis: 'Sickle cell vaso-occlusive crisis', fallRisk: false, npo: false, infection: null, language: 'ar', label: 'Arabic', preferences: ['Female providers preferred', 'Halal diet'] },
  { id: 'pat-418', name: 'Min-Jae K.', mrn: '2840418', room: '418', unit: '4B', floor: '4', age: 47, sex: 'M', diagnosis: 'Pancreatitis, pain control', fallRisk: false, npo: true, infection: null, language: 'ko', label: 'Korean', preferences: ['Uses interpreter for care decisions'] },
  { id: 'pat-425', name: 'Ruth W.', mrn: '2840425', room: '425', unit: '4B', floor: '4', age: 69, sex: 'F', diagnosis: 'Syncope workup', fallRisk: true, npo: false, infection: null, language: 'en', label: 'English', preferences: ['Needs glasses within reach'] },
  { id: 'pat-431', name: 'Priya S.', mrn: '2840431', room: '431', unit: '4B', floor: '4', age: 39, sex: 'F', diagnosis: 'Post-cesarean anemia', fallRisk: false, npo: false, infection: null, language: 'hi', label: 'Hindi', preferences: ['Vegetarian meals'] },
];

const activeSpecs: DemoSpec[] = [
  ['call-live-407', 'pat-407', 'emergent', 'incoming', null, 33, 'I have really bad chest pain and I cannot breathe properly.', null, 'Patient reporting severe chest pain and shortness of breath. Immediate bedside assessment required.', ['chest pain', 'shortness of breath']],
  ['call-live-425', 'pat-425', 'emergent', 'incoming', null, 91, 'I tried to get up and I fell. My hip hurts.', null, 'Fall-risk patient reports fall with possible hip injury and dizziness.', ['fall', 'dizziness', 'hip pain']],
  ['call-live-412', 'pat-412', 'urgent', 'accepted', 'Miko R.', 148, 'I need pain medication. The pain is very severe, eight out of ten.', 'I need pain medication. The pain is very severe, eight out of ten.', 'Arabic-speaking patient requesting IV pain medication. Self-reported pain 8/10.', ['pain', 'medication']],
  ['call-live-403', 'pat-403', 'urgent', 'accepted', 'Jessica T.', 263, 'My stomach pain is getting worse. I need something for it.', null, 'Patient reports worsening abdominal pain and requests analgesic.', ['pain', 'analgesic']],
  ['call-live-411', 'pat-411', 'routine', 'pending', null, 74, 'Can I get some ice chips? Also when can I eat again?', null, 'NPO patient requesting ice chips and asking about meal schedule.', ['npo', 'education']],
  ['call-live-406', 'pat-406', 'routine', 'incoming', null, 39, 'Necesito agua por favor. A que hora puede visitarme mi familia?', 'I need water please. What time can my family visit me?', 'Spanish-speaking patient requesting water and visitor information.', ['water', 'family']],
  ['call-live-431', 'pat-431', 'routine', 'in_progress', 'DeShawn B.', 126, 'Can you raise my bed a little? I also need another pillow.', 'Can you raise my bed a little? I also need another pillow.', 'Hindi-speaking patient requesting bed adjustment and extra pillow.', ['comfort', 'positioning']],
];

function nowMinus(seconds: number) {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

function patient(id: string) {
  return patients.find((p) => p.id === id) || patients[0];
}

function callFromSpec(spec: DemoSpec, index: number): DemoCall {
  const [id, patientId, triage, status, provider, secondsAgo, original, english, summary, keywords] = spec;
  const p = patient(patientId);
  return {
    id,
    patient_id: p.id,
    patient_name: p.name,
    patient_mrn: p.mrn,
    mrn: p.mrn,
    room_number: p.room,
    room: p.room,
    unit: p.unit,
    floor: p.floor,
    age: p.age,
    sex: p.sex,
    diagnosis: p.diagnosis,
    fall_risk: p.fallRisk,
    infection_precautions: p.infection,
    npo: p.npo,
    cultural_preferences: p.preferences.join('; '),
    preferences: p.preferences,
    visitor_info: [{ name: `${p.name.split(' ')[0]} family`, relation: 'Family', phone: '404-555-01' + index.toString().padStart(2, '0') }],
    timestamp: nowMinus(secondsAgo),
    assigned_at: provider ? nowMinus(Math.max(5, secondsAgo - 30)) : null,
    arrived_at: status === 'in_progress' ? nowMinus(Math.max(2, secondsAgo - 90)) : null,
    resolved_at: null,
    status,
    triage_level: triage,
    assigned_provider: provider,
    wait_time_seconds: secondsAgo,
    transcript_original: original,
    transcript_english: english,
    language_detected: p.language,
    language_label: p.label,
    ai_summary: summary,
    confidence_score: triage === 'emergent' ? 0.94 : triage === 'urgent' ? 0.88 : 0.84,
    keywords_detected: [...keywords],
    shift: index % 3 === 0 ? 'night' : 'day',
    resolution: null,
    outcome: null,
  };
}

function activeCalls() {
  return activeSpecs.map(callFromSpec);
}

function resolvedCalls() {
  const summaries = [
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
  ] as const;

  return summaries.map(([summary, triage, wait], index) => {
    const p = patients[index % patients.length];
    const provider = providers[index % providers.length];
    const secondsAgo = 1800 + index * 3900;
    return {
      ...callFromSpec(
        [`call-resolved-${index + 1}`, p.id, triage, 'resolved', provider, secondsAgo, summary, null, summary, [triage, 'resolved']] as DemoSpec,
        index,
      ),
      timestamp: nowMinus(secondsAgo),
      resolved_at: nowMinus(secondsAgo - wait - 240),
      assigned_at: nowMinus(secondsAgo - 30),
      arrived_at: nowMinus(secondsAgo - wait),
      wait_time_seconds: wait,
      resolution: summary,
      outcome: index % 4 === 0 ? 'Escalated to charge nurse' : 'Resolved at bedside',
    };
  });
}

function allCalls() {
  const calls = [...activeCalls(), ...resolvedCalls(), ...historicalCalls()];
  return calls.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}

function historicalCalls() {
  return Array.from({ length: 84 }, (_, i) => {
    const p = patients[i % patients.length];
    const triage = (i % 10 === 0 ? 'emergent' : i % 3 === 0 ? 'urgent' : 'routine') as DemoCall['triage_level'];
    const provider = providers[i % providers.length];
    const wait = triage === 'emergent' ? 35 + (i % 6) * 9 : triage === 'urgent' ? 105 + (i % 8) * 22 : 160 + (i % 10) * 31;
    const daysAgo = 1 + (i % 30);
    const hourOffset = (i * 3) % 24;
    const ts = new Date();
    ts.setDate(ts.getDate() - daysAgo);
    ts.setHours(hourOffset, (i * 7) % 60, 0, 0);
    return {
      ...callFromSpec(
        [`call-hist-${i + 1}`, p.id, triage, 'resolved', provider, Math.max(60, Math.floor((Date.now() - +ts) / 1000)), demoTranscript(triage, p.label), null, demoSummary(triage, p.fallRisk), [triage, p.label.toLowerCase()]] as DemoSpec,
        i,
      ),
      timestamp: ts.toISOString(),
      resolved_at: new Date(+ts + (wait + 240) * 1000).toISOString(),
      assigned_at: new Date(+ts + 30 * 1000).toISOString(),
      arrived_at: new Date(+ts + wait * 1000).toISOString(),
      wait_time_seconds: wait,
      shift: hourOffset >= 19 || hourOffset < 7 ? 'night' : 'day',
      resolution: demoSummary(triage, p.fallRisk),
      outcome: 'Resolved at bedside',
    };
  });
}

function demoTranscript(triage: DemoCall['triage_level'], language: string) {
  if (triage === 'emergent') return 'I feel dizzy and I have chest pressure.';
  if (triage === 'urgent') return language === 'Spanish' ? 'Tengo dolor fuerte y necesito ayuda.' : 'My pain is getting worse and I need help.';
  return 'Can someone help me adjust my room and bring water?';
}

function demoSummary(triage: DemoCall['triage_level'], fallRisk: boolean) {
  if (triage === 'emergent') return fallRisk ? 'Fall-risk patient with urgent safety complaint; immediate response indicated.' : 'Patient reports high-acuity symptoms requiring immediate assessment.';
  if (triage === 'urgent') return 'Patient reports increasing pain and requests clinical assessment.';
  return 'Patient requesting comfort assistance and routine support.';
}

const demoErrors = [
  { id: 1, call_id: 'call-resolved-1', error_type: 'response_delay', description: 'Fall-risk toileting request waited longer than the unit target.', severity: 'high', resolved: 1, reported_by: 'Miko R.', created_at: nowMinus(86400 * 2), resolved_at: nowMinus(86400), resolution_notes: 'Auto-escalation threshold lowered for fall-risk toileting requests.', patient_id: 'pat-407', mrn: '2840407', room: '407' },
  { id: 2, call_id: 'call-resolved-5', error_type: 'translation_review', description: 'Interpreter callback was delayed for Arabic-speaking patient education.', severity: 'medium', resolved: 0, reported_by: 'Jessica T.', created_at: nowMinus(86400 * 4), resolved_at: null, resolution_notes: null, patient_id: 'pat-412', mrn: '2840412', room: '412' },
  { id: 3, call_id: 'call-resolved-9', error_type: 'equipment_failure', description: 'Call tile did not show IV pump battery issue until manual refresh.', severity: 'low', resolved: 1, reported_by: 'Carlos M.', created_at: nowMinus(86400 * 6), resolved_at: nowMinus(86400 * 5), resolution_notes: 'Device heartbeat monitor added.', patient_id: 'pat-418', mrn: '2840418', room: '418' },
  { id: 4, call_id: 'call-resolved-10', error_type: 'triage_error', description: 'Chest pressure transcript initially scored urgent before hard-rule override.', severity: 'critical', resolved: 1, reported_by: 'Miko R.', created_at: nowMinus(86400 * 9), resolved_at: nowMinus(86400 * 8), resolution_notes: 'Chest pain rule promoted to mandatory override.', patient_id: 'pat-425', mrn: '2840425', room: '425' },
];

function filteredCalls(url: URL) {
  let calls = allCalls();
  const status = url.searchParams.get('status');
  const triage = url.searchParams.get('triage');
  const unit = url.searchParams.get('unit');
  const shift = url.searchParams.get('shift');
  const limit = Number(url.searchParams.get('limit') || 200);
  if (status) calls = calls.filter((c) => c.status === status);
  if (triage) calls = calls.filter((c) => c.triage_level === triage);
  if (unit) calls = calls.filter((c) => c.unit === unit);
  if (shift) calls = calls.filter((c) => c.shift === shift);
  return calls.slice(0, limit);
}

function analytics(url: URL) {
  const calls = filteredByAnalytics(url);
  const totals = {
    total_calls: calls.length,
    emergent_count: count(calls, 'emergent'),
    urgent_count: count(calls, 'urgent'),
    routine_count: count(calls, 'routine'),
    avg_wait_seconds: avg(calls.map((c) => c.wait_time_seconds)),
    avg_resolution_seconds: avg(calls.map((c) => (c.resolved_at ? Math.max(180, c.wait_time_seconds + 220) : null))),
    avg_ai_confidence: avg(calls.map((c) => c.confidence_score * 100)),
    resolved_count: calls.filter((c) => c.status === 'resolved').length,
  };
  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const subset = calls.filter((c) => new Date(c.timestamp).getHours() === hour);
    return { hour, count: subset.length, avg_wait: avg(subset.map((c) => c.wait_time_seconds)), emergent: count(subset, 'emergent'), urgent: count(subset, 'urgent'), routine: count(subset, 'routine') };
  });
  const dayMap = new Map<string, DemoCall[]>();
  for (const call of calls) {
    const key = call.timestamp.slice(0, 10);
    dayMap.set(key, [...(dayMap.get(key) || []), call]);
  }
  const byDay = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => ({ date, count: list.length, avg_wait: avg(list.map((c) => c.wait_time_seconds)), emergent: count(list, 'emergent'), urgent: count(list, 'urgent'), routine: count(list, 'routine') }));
  const byTriage = (['emergent', 'urgent', 'routine'] as const).map((triage_level) => {
    const subset = calls.filter((c) => c.triage_level === triage_level);
    return { triage_level, count: subset.length, avg_wait: avg(subset.map((c) => c.wait_time_seconds)) };
  });
  const byProvider = providers.map((assigned_provider) => {
    const subset = calls.filter((c) => c.assigned_provider === assigned_provider);
    return { assigned_provider, count: subset.length, avg_wait: avg(subset.map((c) => c.wait_time_seconds)), avg_resolution: avg(subset.map((c) => c.wait_time_seconds + 240)) };
  }).filter((p) => p.count > 0);
  const topPatients = patients.map((p) => {
    const subset = calls.filter((c) => c.patient_id === p.id);
    return { patient_id: p.id, mrn: p.mrn, room: p.room, call_count: subset.length, avg_wait: avg(subset.map((c) => c.wait_time_seconds)) };
  }).sort((a, b) => b.call_count - a.call_count).slice(0, 5);
  return { totals, byHour, byDay, byTriage, byProvider, topPatients, falls: calls.filter((c) => c.fall_risk).length, errors: { count: demoErrors.length, resolved: demoErrors.filter((e) => e.resolved).length } };
}

function filteredByAnalytics(url: URL) {
  let calls = allCalls();
  const unit = url.searchParams.get('unit');
  const shift = url.searchParams.get('shift');
  if (unit) calls = calls.filter((c) => c.unit === unit);
  if (shift) calls = calls.filter((c) => c.shift === shift);
  return calls;
}

function count(calls: DemoCall[], triage: DemoCall['triage_level']) {
  return calls.filter((c) => c.triage_level === triage).length;
}

function avg(values: Array<number | null | undefined>) {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return nums.length ? Math.round((nums.reduce((sum, v) => sum + v, 0) / nums.length) * 10) / 10 : 0;
}

function responseTimes(url: URL) {
  const calls = filteredByAnalytics(url);
  const buckets = [
    ['<1min', (v: number) => v < 60],
    ['1-2min', (v: number) => v >= 60 && v < 120],
    ['2-3min', (v: number) => v >= 120 && v < 180],
    ['3-5min', (v: number) => v >= 180 && v < 300],
    ['5-10min', (v: number) => v >= 300 && v < 600],
    ['>10min', (v: number) => v >= 600],
  ] as const;
  return {
    distribution: buckets.map(([bucket, test]) => ({ bucket, count: calls.filter((c) => test(c.wait_time_seconds)).length })),
    byTriageLevel: (['emergent', 'urgent', 'routine'] as const).map((triage_level) => {
      const subset = calls.filter((c) => c.triage_level === triage_level);
      const waits = subset.map((c) => c.wait_time_seconds);
      return { triage_level, avg_wait: avg(waits), min_wait: waits.length ? Math.min(...waits) : 0, max_wait: waits.length ? Math.max(...waits) : 0, count: subset.length };
    }),
  };
}

function languageAnalytics(url: URL) {
  const calls = filteredByAnalytics(url);
  const rows = [...new Set(calls.map((c) => c.language_detected))].map((language) => {
    const subset = calls.filter((c) => c.language_detected === language);
    return { language, language_label: subset[0]?.language_label || language, count: subset.length, avg_wait: avg(subset.map((c) => c.wait_time_seconds)) };
  }).sort((a, b) => b.count - a.count);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const nonEnglish = rows.filter((row) => row.language !== 'en').reduce((sum, row) => sum + row.count, 0);
  return { breakdown: rows, total, nonEnglish, pctNonEnglish: total ? Math.round((nonEnglish / total) * 1000) / 10 : 0 };
}

function providerAnalytics(url: URL) {
  const calls = filteredByAnalytics(url);
  const providerRows = providers.map((name) => {
    const subset = calls.filter((c) => c.assigned_provider === name);
    return {
      name,
      total_calls: subset.length,
      emergent: count(subset, 'emergent'),
      urgent: count(subset, 'urgent'),
      routine: count(subset, 'routine'),
      avg_response_sec: avg(subset.map((c) => c.wait_time_seconds)),
      emergent_response_sec: avg(subset.filter((c) => c.triage_level === 'emergent').map((c) => c.wait_time_seconds)),
      urgent_response_sec: avg(subset.filter((c) => c.triage_level === 'urgent').map((c) => c.wait_time_seconds)),
      routine_response_sec: avg(subset.filter((c) => c.triage_level === 'routine').map((c) => c.wait_time_seconds)),
      min_response_sec: subset.length ? Math.min(...subset.map((c) => c.wait_time_seconds)) : 0,
      max_response_sec: subset.length ? Math.max(...subset.map((c) => c.wait_time_seconds)) : 0,
      avg_resolution_sec: avg(subset.map((c) => c.wait_time_seconds + 240)),
      avg_ai_confidence: avg(subset.map((c) => c.confidence_score * 100)),
      active_days: new Set(subset.map((c) => c.timestamp.slice(0, 10))).size,
    };
  }).filter((row) => row.total_calls > 0);
  const systemByTriage = (['emergent', 'urgent', 'routine'] as const).map((triage_level) => {
    const subset = calls.filter((c) => c.triage_level === triage_level);
    return { triage_level, count: subset.length, avg_response_sec: avg(subset.map((c) => c.wait_time_seconds)) };
  });
  return { providers: providerRows, systemByTriage };
}

function fallRisk(url: URL) {
  const calls = filteredByAnalytics(url).filter((c) => c.fall_risk);
  const fallRiskPatients = patients.filter((p) => p.fallRisk).map((p) => {
    const subset = calls.filter((c) => c.patient_id === p.id);
    return { id: p.id, mrn: p.mrn, room: p.room, diagnosis: p.diagnosis, call_count: subset.length, avg_wait: avg(subset.map((c) => c.wait_time_seconds)), fall_related_calls: subset.filter((c) => /fall|bathroom|dizzy/i.test(c.ai_summary + c.transcript_original)).length };
  });
  return { fallCalls: calls.slice(0, 40), fallRiskPatients };
}

function errorAnalytics() {
  const byType = [...new Set(demoErrors.map((e) => e.error_type))].map((error_type) => {
    const rows = demoErrors.filter((e) => e.error_type === error_type);
    return { error_type, count: rows.length, resolved: rows.filter((e) => e.resolved).length };
  });
  const byDay = demoErrors.map((e) => ({ date: e.created_at.slice(0, 10), count: 1, resolved: e.resolved ? 1 : 0 }));
  return { errors: demoErrors, byType, byDay };
}

function costAnalytics() {
  const byDay = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const triage_calls = 28 + (i % 6) * 4;
    const qi_queries = 3 + (i % 4);
    const chart_requests = 2 + (i % 3);
    const triage_cost = +(triage_calls * 0.0028).toFixed(4);
    const qi_cost = +(qi_queries * 0.018).toFixed(4);
    const chart_cost = +(chart_requests * 0.011).toFixed(4);
    return { date: date.toISOString().slice(0, 10), calls: triage_calls + qi_queries + chart_requests, triage_calls, qi_queries, chart_requests, triage_cost, qi_cost, chart_cost, total_cost: +(triage_cost + qi_cost + chart_cost).toFixed(4), total_tokens: 22000 + i * 950 };
  });
  const totals = byDay.reduce((acc, row) => ({
    total_calls: acc.total_calls + row.calls,
    calls: acc.calls + row.triage_calls,
    qi_queries: acc.qi_queries + row.qi_queries,
    chart_requests: acc.chart_requests + row.chart_requests,
    triage_cost: +(acc.triage_cost + row.triage_cost).toFixed(4),
    qi_cost: +(acc.qi_cost + row.qi_cost).toFixed(4),
    chart_cost: +(acc.chart_cost + row.chart_cost).toFixed(4),
    total_cost: +(acc.total_cost + row.total_cost).toFixed(4),
    total_tokens: acc.total_tokens + row.total_tokens,
  }), { total_calls: 0, calls: 0, qi_queries: 0, chart_requests: 0, triage_cost: 0, qi_cost: 0, chart_cost: 0, total_cost: 0, total_tokens: 0 });
  const avgDailyCost = +(totals.total_cost / byDay.length).toFixed(6);
  return {
    logs: byDay.flatMap((row, i) => [
      { id: i * 3 + 1, timestamp: row.date, source: 'provider_dash', endpoint: 'triage', model: 'claude-sonnet-demo', input_tokens: 1200, output_tokens: 180, cost_usd: row.triage_cost, request_summary: 'Auto-triage call transcript', success: 1 },
      { id: i * 3 + 2, timestamp: row.date, source: 'qi_platform', endpoint: 'qi_query', model: 'claude-opus-demo', input_tokens: 4200, output_tokens: 520, cost_usd: row.qi_cost, request_summary: 'QI Agent summary', success: 1 },
    ]),
    byDay,
    totals,
    avgDailyCost,
    projectedMonthly: +(avgDailyCost * 30).toFixed(4),
    costPerCall: +(totals.total_cost / Math.max(1, totals.calls)).toFixed(6),
    days: 14,
  };
}

function chartData(requestText: string) {
  const request = requestText.toLowerCase();
  if (request.includes('language')) {
    return { title: 'Call Volume by Language', description: 'Non-English calls make up a meaningful share of the demo unit volume.', chartType: 'bar', xKey: 'language_label', yKey: 'count', chartData: languageAnalytics(new URL('https://relay.local')).breakdown };
  }
  if (request.includes('provider')) {
    return { title: 'Response Time by Provider', description: 'Average response time across assigned providers for demo calls.', chartType: 'bar', xKey: 'name', yKey: 'avg_response_sec', chartData: providerAnalytics(new URL('https://relay.local')).providers };
  }
  if (request.includes('triage') || request.includes('pie')) {
    return { title: 'Triage Distribution', description: 'Emergent, urgent, and routine call distribution across the demo dataset.', chartType: 'pie', xKey: 'name', yKey: 'count', chartData: analytics(new URL('https://relay.local')).byTriage.map((row) => ({ name: row.triage_level, count: row.count })) };
  }
  if (request.includes('hour')) {
    return { title: 'Hourly Call Volume', description: 'Peak demo volume clusters around shift-change windows.', chartType: 'area', xKey: 'hour', yKey: 'count', chartData: analytics(new URL('https://relay.local')).byHour };
  }
  return { title: 'Daily Call Volume', description: 'Demo call volume over the last 30 days.', chartType: 'line', xKey: 'date', yKey: 'count', chartData: analytics(new URL('https://relay.local')).byDay };
}

function qiAnswer(question: string) {
  const q = question.toLowerCase();
  if (q.includes('fall')) {
    return { answer: 'Fall-risk patients are generating 38% of calls in this demo dataset, with the slowest responses tied to toileting and mobility requests. The strongest QI opportunity is auto-escalating fall-risk bathroom requests and auditing response targets by shift.', citations: ['Fall-risk monitor', 'Response-time distribution'], suggestedCharts: ['Show fall-risk response time by triage', 'Compare fall-risk vs non-fall-risk wait times'] };
  }
  if (q.includes('language') || q.includes('interpreter')) {
    return { answer: 'Non-English calls represent a significant demo segment and trend slower than English calls. Spanish and Arabic calls show the highest volume, so interpreter workflow timing is a good quality metric for the pilot.', citations: ['Language breakdown', 'Call log'], suggestedCharts: ['Show call volume by language over the last 30 days'] };
  }
  return { answer: 'The demo unit is handling high call volume with response performance clustered under 3 minutes, but emergent and fall-risk calls should be the primary quality focus. Miko R. has the fastest average response among high-volume providers in this seeded dataset.', citations: ['Overview dashboard', 'Provider metrics'], suggestedCharts: ['Compare response times across providers as a bar chart', 'Display hourly call volume as an area chart'] };
}

const instructions = [
  { id: 1, triage_level: 'emergent', condition_text: 'Any chest pain, shortness of breath, fall, bleeding, seizure activity, or self-harm statement', sort_order: 1 },
  { id: 2, triage_level: 'urgent', condition_text: 'Moderate or increasing pain, nausea, new dizziness, or medication request', sort_order: 2 },
  { id: 3, triage_level: 'routine', condition_text: 'Comfort requests, food and beverage questions, family communication, room environment', sort_order: 3 },
];

async function demoResponse(req: Request, context: RouteContext) {
  const params = await context.params;
  const path = (params.path || []).join('/');
  const url = new URL(req.url);

  if (req.method === 'POST' && path === 'chart-data') {
    const body = await safeBody(req);
    return NextResponse.json(chartData(String(body.request || body.query || '')));
  }
  if (req.method === 'POST' && path === 'qi-query') {
    const body = await safeBody(req);
    return NextResponse.json(qiAnswer(String(body.question || body.query || body.message || '')));
  }
  if (req.method === 'POST' && path === 'demo/reset') return NextResponse.json({ ok: true, calls: activeCalls() });
  if (req.method === 'POST' && path === 'errors') return NextResponse.json({ id: Date.now(), ok: true });
  if (req.method === 'POST' && path === 'instructions') {
    const body = await safeBody(req);
    return NextResponse.json({ id: Date.now(), triage_level: body.triage_level || 'urgent', condition_text: body.condition_text || 'Demo instruction', sort_order: 99 });
  }
  if (req.method === 'POST' && /patients\/[^/]+\/preferences/.test(path)) return NextResponse.json({ ok: true });
  if ((req.method === 'PATCH' || req.method === 'DELETE') && path.startsWith('instructions')) return NextResponse.json({ ok: true });
  if (req.method === 'PATCH' && path.startsWith('calls/')) {
    const id = path.split('/')[1];
    const body = await safeBody(req);
    const found = allCalls().find((c) => c.id === id) || activeCalls()[0];
    return NextResponse.json({ ...found, ...body });
  }

  if (path === 'calls/active') return NextResponse.json(activeCalls());
  if (path === 'calls') return NextResponse.json({ calls: filteredCalls(url) });
  const messageMatch = path.match(/^calls\/([^/]+)\/messages$/);
  if (messageMatch) return NextResponse.json(messagesForCall(messageMatch[1]));
  const callMatch = path.match(/^calls\/([^/]+)$/);
  if (callMatch) return NextResponse.json(allCalls().find((c) => c.id === callMatch[1]) || activeCalls()[0]);
  if (path === 'analytics') return NextResponse.json(analytics(url));
  if (path === 'analytics/response-times') return NextResponse.json(responseTimes(url));
  if (path === 'analytics/languages') return NextResponse.json(languageAnalytics(url));
  if (path === 'analytics/providers') return NextResponse.json(providerAnalytics(url));
  if (path === 'analytics/fall-risk') return NextResponse.json(fallRisk(url));
  if (path === 'analytics/errors') return NextResponse.json(errorAnalytics());
  if (path === 'analytics/costs') return NextResponse.json(costAnalytics());
  if (path === 'errors') return NextResponse.json({ errors: demoErrors });
  if (path === 'instructions') return NextResponse.json(instructions);

  return NextResponse.json({ ok: true, path });
}

function messagesForCall(callId: string) {
  return [
    { id: `${callId}-m1`, call_id: callId, sender: 'patient', content: 'Can someone come in? I need help.', created_at: nowMinus(120), timestamp: nowMinus(120) },
    { id: `${callId}-m2`, call_id: callId, sender: 'provider', provider: 'Miko R.', content: 'I see your call. I am reviewing the request now.', created_at: nowMinus(90), timestamp: nowMinus(90) },
  ];
}

async function safeBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function GET(req: Request, context: RouteContext) {
  return demoResponse(req, context);
}

export async function POST(req: Request, context: RouteContext) {
  return demoResponse(req, context);
}

export async function PATCH(req: Request, context: RouteContext) {
  return demoResponse(req, context);
}

export async function DELETE(req: Request, context: RouteContext) {
  return demoResponse(req, context);
}
