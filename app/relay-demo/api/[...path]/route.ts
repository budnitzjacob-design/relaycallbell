import { NextResponse } from 'next/server';
import {
  activeCalls,
  addInstruction,
  addMessage,
  addPreference,
  classify,
  deleteInstruction,
  ensureRelayDemoState,
  getCall,
  getPatient,
  handleEvent,
  listCalls,
  listInstructions,
  listMessages,
  listPatients,
  loginPatient,
  patchCall,
  providers,
  rateCall,
  resetDemoCalls,
  updatePatientName,
  upsertCall,
  type RelayCall,
  type TriageLevel,
} from '@/lib/relay-demo/state';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path?: string[] }> };

async function demoResponse(req: Request, context: RouteContext) {
  await ensureRelayDemoState();
  const params = await context.params;
  const path = (params.path || []).join('/');
  const url = new URL(req.url);

  if (req.method === 'POST' && path === 'transcribe') {
    return NextResponse.json({ text: 'I need help. I am having pain and need someone to check on me.', language_detected: 'en', language_name: 'English' });
  }
  if (req.method === 'POST' && path === 'triage') {
    const body = await safeBody(req);
    return NextResponse.json(classify(String(body.transcript || '')));
  }
  if (req.method === 'POST' && path === 'events') {
    const body = await safeBody(req);
    const result = await handleEvent(String(body.event || ''), body.payload || {});
    return NextResponse.json(result || { ok: true });
  }
  if (req.method === 'POST' && path === 'chart-data') {
    const body = await safeBody(req);
    return NextResponse.json(await chartData(String(body.request || body.query || '')));
  }
  if (req.method === 'POST' && path === 'qi-query') {
    const body = await safeBody(req);
    return NextResponse.json(await qiAnswer(String(body.question || body.query || body.message || '')));
  }
  if (req.method === 'POST' && path === 'demo/reset') return NextResponse.json({ ok: true, calls: await resetDemoCalls() });
  if (req.method === 'POST' && path === 'errors') return NextResponse.json({ id: Date.now(), ok: true });
  if (req.method === 'POST' && path === 'calls') return NextResponse.json(await upsertCall(await safeBody(req)));
  if (req.method === 'POST' && path === 'patients/login') {
    const body = await safeBody(req);
    const patient = await loginPatient(String(body.last_name || ''), String(body.dob || ''));
    return patient ? NextResponse.json(patient) : NextResponse.json({ error: 'No patient found with that last name and date of birth.' }, { status: 404 });
  }
  if (req.method === 'POST' && path === 'instructions') {
    const body = await safeBody(req);
    if (!body.condition_text?.trim()) return NextResponse.json({ error: 'condition_text required' }, { status: 400 });
    return NextResponse.json(await addInstruction(String(body.triage_level || 'urgent'), String(body.condition_text)));
  }
  if (req.method === 'POST') {
    const preferenceMatch = path.match(/^patients\/([^/]+)\/preferences$/);
    if (preferenceMatch) return NextResponse.json(await addPreference(preferenceMatch[1], String((await safeBody(req)).preference_text || '')));
    const messageMatch = path.match(/^calls\/([^/]+)\/messages$/);
    if (messageMatch) {
      const body = await safeBody(req);
      return NextResponse.json(await addMessage(messageMatch[1], String(body.sender || 'provider'), String(body.content || ''), body.provider || null));
    }
  }
  if (req.method === 'PATCH') {
    const nameMatch = path.match(/^patients\/([^/]+)\/name$/);
    if (nameMatch) return NextResponse.json(await updatePatientName(nameMatch[1], String((await safeBody(req)).first_name || 'Patient')));
    const ratingMatch = path.match(/^calls\/([^/]+)\/rating$/);
    if (ratingMatch) return NextResponse.json(await rateCall(ratingMatch[1], Number((await safeBody(req)).rating || 0)));
    const callMatch = path.match(/^calls\/([^/]+)$/);
    if (callMatch) return NextResponse.json(await patchCall(callMatch[1], await safeBody(req)));
  }
  if (req.method === 'DELETE' && path.startsWith('instructions/')) return NextResponse.json(await deleteInstruction(path.split('/')[1]));

  if (path === 'calls/active') return NextResponse.json(await activeCalls());
  if (path === 'calls') return NextResponse.json({ calls: await listCalls(url) });
  const messageMatch = path.match(/^calls\/([^/]+)\/messages$/);
  if (messageMatch) return NextResponse.json(await listMessages(messageMatch[1]));
  const callMatch = path.match(/^calls\/([^/]+)$/);
  if (callMatch) {
    const call = await getCall(callMatch[1]);
    return NextResponse.json(call || { error: 'Call not found' }, { status: call ? 200 : 404 });
  }
  if (path === 'patients') return NextResponse.json(await listPatients());
  const patientMatch = path.match(/^patients\/([^/]+)$/);
  if (patientMatch) {
    const patient = await getPatient(patientMatch[1]);
    return NextResponse.json(patient || { error: 'Patient not found' }, { status: patient ? 200 : 404 });
  }
  if (path === 'analytics') return NextResponse.json(await analytics(url));
  if (path === 'analytics/response-times') return NextResponse.json(await responseTimes(url));
  if (path === 'analytics/languages') return NextResponse.json(await languageAnalytics(url));
  if (path === 'analytics/providers') return NextResponse.json(await providerAnalytics(url));
  if (path === 'analytics/fall-risk') return NextResponse.json(await fallRisk(url));
  if (path === 'analytics/errors') return NextResponse.json(errorAnalytics());
  if (path === 'analytics/costs') return NextResponse.json(costAnalytics());
  if (path === 'errors') return NextResponse.json({ errors: demoErrors() });
  if (path === 'instructions') return NextResponse.json(await listInstructions());

  return NextResponse.json({ ok: true, path });
}

async function callsForAnalytics(url = new URL('https://relay.local')) {
  const analyticsUrl = new URL(url.toString());
  analyticsUrl.searchParams.set('limit', '5000');
  return listCalls(analyticsUrl);
}

async function analytics(url: URL) {
  const calls = await callsForAnalytics(url);
  const totals = {
    total_calls: calls.length,
    emergent_count: count(calls, 'emergent'),
    urgent_count: count(calls, 'urgent'),
    routine_count: count(calls, 'routine'),
    avg_wait_seconds: avg(calls.map((c) => c.wait_time_seconds)),
    avg_resolution_seconds: avg(calls.map((c) => (c.resolved_at ? c.wait_time_seconds + 220 : null))),
    avg_ai_confidence: avg(calls.map((c) => c.confidence_score * 100)),
    resolved_count: calls.filter((c) => c.status === 'resolved').length,
  };
  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const subset = calls.filter((c) => new Date(c.timestamp).getHours() === hour);
    return { hour, count: subset.length, avg_wait: avg(subset.map((c) => c.wait_time_seconds)), emergent: count(subset, 'emergent'), urgent: count(subset, 'urgent'), routine: count(subset, 'routine') };
  });
  const dayMap = new Map<string, RelayCall[]>();
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
  const topPatients = [...new Map(calls.map((c) => [c.patient_id, c])).values()].map((p) => {
    const subset = calls.filter((c) => c.patient_id === p.patient_id);
    return { patient_id: p.patient_id, mrn: p.mrn, room: p.room, call_count: subset.length, avg_wait: avg(subset.map((c) => c.wait_time_seconds)) };
  }).sort((a, b) => b.call_count - a.call_count).slice(0, 5);
  return { totals, byHour, byDay, byTriage, byProvider, topPatients, falls: calls.filter((c) => c.fall_risk).length, errors: { count: demoErrors().length, resolved: demoErrors().filter((e) => e.resolved).length } };
}

async function responseTimes(url: URL) {
  const calls = await callsForAnalytics(url);
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

async function languageAnalytics(url: URL) {
  const calls = await callsForAnalytics(url);
  const rows = [...new Set(calls.map((c) => c.language_detected))].map((language) => {
    const subset = calls.filter((c) => c.language_detected === language);
    return { language, language_label: subset[0]?.language_label || language, count: subset.length, avg_wait: avg(subset.map((c) => c.wait_time_seconds)) };
  }).sort((a, b) => b.count - a.count);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const nonEnglish = rows.filter((row) => row.language !== 'en').reduce((sum, row) => sum + row.count, 0);
  return { breakdown: rows, total, nonEnglish, pctNonEnglish: total ? Math.round((nonEnglish / total) * 1000) / 10 : 0 };
}

async function providerAnalytics(url: URL) {
  const calls = await callsForAnalytics(url);
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

async function fallRisk(url: URL) {
  const calls = (await callsForAnalytics(url)).filter((c) => c.fall_risk);
  const patients = [...new Map(calls.map((c) => [c.patient_id, c])).values()];
  const fallRiskPatients = patients.map((p) => {
    const subset = calls.filter((c) => c.patient_id === p.patient_id);
    return { id: p.patient_id, mrn: p.mrn, room: p.room, diagnosis: p.diagnosis, call_count: subset.length, avg_wait: avg(subset.map((c) => c.wait_time_seconds)), fall_related_calls: subset.filter((c) => /fall|bathroom|dizzy/i.test(c.ai_summary + c.transcript_original)).length };
  });
  return { fallCalls: calls.slice(0, 40), fallRiskPatients };
}

async function chartData(requestText: string) {
  const request = requestText.toLowerCase();
  if (request.includes('language')) return { title: 'Call Volume by Language', description: 'Non-English calls make up a meaningful share of the demo unit volume.', chartType: 'bar', xKey: 'language_label', yKey: 'count', chartData: (await languageAnalytics(new URL('https://relay.local'))).breakdown };
  if (request.includes('provider')) return { title: 'Response Time by Provider', description: 'Average response time across assigned providers for demo calls.', chartType: 'bar', xKey: 'name', yKey: 'avg_response_sec', chartData: (await providerAnalytics(new URL('https://relay.local'))).providers };
  if (request.includes('triage') || request.includes('pie')) return { title: 'Triage Distribution', description: 'Emergent, urgent, and routine call distribution across the demo dataset.', chartType: 'pie', xKey: 'name', yKey: 'count', chartData: (await analytics(new URL('https://relay.local'))).byTriage.map((row) => ({ name: row.triage_level, count: row.count })) };
  if (request.includes('hour')) return { title: 'Hourly Call Volume', description: 'Peak demo volume clusters around shift-change windows.', chartType: 'area', xKey: 'hour', yKey: 'count', chartData: (await analytics(new URL('https://relay.local'))).byHour };
  return { title: 'Daily Call Volume', description: 'Demo call volume over the last 30 days.', chartType: 'line', xKey: 'date', yKey: 'count', chartData: (await analytics(new URL('https://relay.local'))).byDay };
}

async function qiAnswer(question: string) {
  const q = question.toLowerCase();
  if (q.includes('fall')) return { answer: 'Fall-risk patients are generating a substantial share of calls, with the slowest responses tied to toileting and mobility requests. The strongest QI opportunity is auto-escalating fall-risk bathroom requests and auditing response targets by shift.', citations: ['Fall-risk monitor', 'Response-time distribution'], suggestedCharts: ['Show fall-risk response time by triage', 'Compare fall-risk vs non-fall-risk wait times'] };
  if (q.includes('language') || q.includes('interpreter')) return { answer: 'Non-English calls represent a significant demo segment and trend slower than English calls. Spanish and Arabic calls show the highest volume, so interpreter workflow timing is a good quality metric for the pilot.', citations: ['Language breakdown', 'Call log'], suggestedCharts: ['Show call volume by language over the last 30 days'] };
  return { answer: 'The demo unit is handling high call volume with response performance clustered under 3 minutes, but emergent and fall-risk calls should be the primary quality focus. Miko R. has the fastest average response among high-volume providers in this seeded dataset.', citations: ['Overview dashboard', 'Provider metrics'], suggestedCharts: ['Compare response times across providers as a bar chart', 'Display hourly call volume as an area chart'] };
}

function errorAnalytics() {
  const errors = demoErrors();
  const byType = [...new Set(errors.map((e) => e.error_type))].map((error_type) => {
    const rows = errors.filter((e) => e.error_type === error_type);
    return { error_type, count: rows.length, resolved: rows.filter((e) => e.resolved).length };
  });
  return { errors, byType, byDay: errors.map((e) => ({ date: e.created_at.slice(0, 10), count: 1, resolved: e.resolved ? 1 : 0 })) };
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
  return { logs: [], byDay, totals, avgDailyCost: +(totals.total_cost / byDay.length).toFixed(6), projectedMonthly: +((totals.total_cost / byDay.length) * 30).toFixed(4), costPerCall: +(totals.total_cost / Math.max(1, totals.calls)).toFixed(6), days: 14 };
}

function demoErrors() {
  const nowMinus = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString();
  return [
    { id: 1, call_id: 'resolved-1', error_type: 'response_delay', description: 'Fall-risk toileting request waited longer than the unit target.', severity: 'high', resolved: 1, reported_by: 'Miko R.', created_at: nowMinus(86400 * 2), resolved_at: nowMinus(86400), resolution_notes: 'Auto-escalation threshold lowered for fall-risk toileting requests.', patient_id: 'pat-407', mrn: '2840407', room: '407' },
    { id: 2, call_id: 'resolved-5', error_type: 'translation_review', description: 'Interpreter callback was delayed for patient education.', severity: 'medium', resolved: 0, reported_by: 'Jessica T.', created_at: nowMinus(86400 * 4), resolved_at: null, resolution_notes: null, patient_id: 'pat-412', mrn: '2840412', room: '412' },
    { id: 3, call_id: 'resolved-9', error_type: 'equipment_failure', description: 'Call tile did not show IV pump battery issue until manual refresh.', severity: 'low', resolved: 1, reported_by: 'Carlos M.', created_at: nowMinus(86400 * 6), resolved_at: nowMinus(86400 * 5), resolution_notes: 'Device heartbeat monitor added.', patient_id: 'pat-418', mrn: '2840418', room: '418' },
  ];
}

function count(calls: RelayCall[], triage: TriageLevel) {
  return calls.filter((c) => c.triage_level === triage).length;
}

function avg(values: Array<number | null | undefined>) {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return nums.length ? Math.round((nums.reduce((sum, v) => sum + v, 0) / nums.length) * 10) / 10 : 0;
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
