// Generates supabase/seed.sql from content.js — run: node supabase/build-seed.js
const fs = require('fs'), path = require('path');
const { LEVELS, LESSONS, GLOSS } = require('./content.js');
const q = s => s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'";
const j = o => q(JSON.stringify(o)) + '::jsonb';
let sql = '-- Know UAV content seed. Paste into Supabase SQL Editor and Run (after schema.sql). Safe to re-run.\nbegin;\n';
sql += 'insert into public.levels (id,title,en,descr) values\n' + LEVELS.map(l => `(${l.id},${q(l.title)},${q(l.en)},${q(l.desc)})`).join(',\n') +
  '\non conflict (id) do update set title=excluded.title, en=excluded.en, descr=excluded.descr;\n';
for (const l of LESSONS) {
  sql += `insert into public.lessons (id,level,ord,title,hook,mins,is_free,body,scenes,quiz,audio_url) values (${q(l.id)},${l.level},${l.ord},${q(l.title)},${q(l.hook)},${l.mins},${!!l.free},${j(l.body)},${j(l.scenes)},${j(l.quiz)},${q(l.audio_url)})\n` +
    'on conflict (id) do update set level=excluded.level, ord=excluded.ord, title=excluded.title, hook=excluded.hook, mins=excluded.mins, is_free=excluded.is_free, body=excluded.body, scenes=excluded.scenes, quiz=excluded.quiz, audio_url=coalesce(excluded.audio_url, public.lessons.audio_url);\n';
}
sql += 'delete from public.glossary;\ninsert into public.glossary (term,ar,def) values\n' + GLOSS.map(g => `(${q(g[0])},${q(g[1])},${q(g[2])})`).join(',\n') + ';\ncommit;\n';
fs.writeFileSync(path.join(__dirname, 'seed.sql'), sql);
console.log('seed.sql written:', LESSONS.length, 'lessons,', GLOSS.length, 'terms,', sql.length, 'bytes');
