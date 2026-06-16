// End-to-end smoke test (no deps; uses Node's global fetch).
// Run with the API server already started:  node smoke_test.mjs
const BASE = process.env.BASE ?? 'http://localhost:4000';
let pass = 0;
let fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log(`  OK  ${msg}`)) : (fail++, console.log(`  FAIL ${msg}`)));

async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { status: res.status, json };
}
const login = async (email, password) => (await api('POST', '/auth/login', { body: { email, password } })).json;

console.log('== health ==');
ok((await api('GET', '/health')).status === 200, 'GET /health 200');

const RUN = Date.now(); // unique per run so the test is repeatable

console.log('\n== create 3 students ==');
const students = [];
for (let i = 1; i <= 3; i++) {
  const email = `s${i}_${RUN}@test.edu`;
  const r = await api('POST', '/auth/register', { body: { email, password: 'Passw0rd!', display_name: `Student ${i}` } });
  students.push(r.json);
}
ok(students.every((s) => s?.token), 'all 3 students have tokens');

console.log('\n== RBAC: student cannot create events ==');
const forbid = await api('POST', '/events', {
  token: students[0].token,
  body: { title: 'x', starts_at: '2030-01-01T10:00:00Z', capacity: 1 },
});
ok(forbid.status === 403, `student create event -> 403 (got ${forbid.status})`);

console.log('\n== organizer creates + publishes a fresh capacity-2 event ==');
const org = await login('organizer@school.edu', 'Organizer123!');
const created = await api('POST', '/events', {
  token: org.token,
  body: { title: `Smoke Test Event ${RUN}`, description: 'temp', starts_at: '2030-01-01T10:00:00Z', capacity: 2 },
});
ok(created.status === 201 && created.json.event.status === 'draft', 'event created as draft');
const ev = created.json.event;
const published = await api('POST', `/events/${ev.id}/publish`, { token: org.token });
ok(published.json.event.status === 'published', 'event published');

console.log('\n== register all 3 (expect confirmed, confirmed, waitlisted) ==');
const results = [];
for (const s of students) {
  const r = await api('POST', `/events/${ev.id}/registrations`, { token: s.token });
  results.push(r.json);
  console.log(`  ${s.user.email} -> ${r.json.status} (waitlist_position=${r.json.waitlist_position})`);
}
ok(results[0].status === 'confirmed' && results[1].status === 'confirmed', 'first two confirmed');
ok(results[2].status === 'waitlisted' && results[2].waitlist_position === 1, 'third waitlisted at position 1');

console.log('\n== overbooking guard: only 2 confirmed ==');
const confirmedList = (await api('GET', `/events/${ev.id}/registrations`, { token: org.token })).json.registrations;
ok(confirmedList.length === 2, `confirmed count == capacity (2), got ${confirmedList.length}`);

console.log('\n== student1 cancels confirmed seat -> student3 auto-promoted ==');
const me1 = (await api('GET', '/registrations/me', { token: students[0].token })).json.registrations;
const del = await api('DELETE', `/registrations/${me1[0].id}`, { token: students[0].token });
ok(del.json.promoted_registration, `cancel promoted a waitlister (${del.json.promoted_registration})`);
const me3 = (await api('GET', '/registrations/me', { token: students[2].token })).json.registrations;
ok(me3[0].status === 'confirmed', 'student3 is now confirmed');

console.log('\n== ownership: student cannot read jobs (organizer-only) ==');
ok((await api('GET', '/notification-jobs', { token: students[1].token })).status === 403, 'student -> 403 on /notification-jobs');

console.log('\n== enqueued jobs (the queue) ==');
const jobs = (await api('GET', `/notification-jobs?event_id=${ev.id}`, { token: org.token })).json.jobs;
const types = jobs.map((j) => j.type);
for (const j of jobs) console.log(`  - ${j.type} [${j.status}] attempts=${j.attempts}`);
ok(types.includes('RegistrationConfirmed') && types.includes('RegistrationWaitlisted') && types.includes('WaitlistPromoted'),
  'all 3 required job types present');

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
