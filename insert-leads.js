// Lê o CSV do gosom e grava no Neon — SEM duplicar.
// Uso: node insert-leads.js results.csv [max]
// Regra: já existe pelo telefone OU pelo place_id -> só atualiza o que falta.
import fs from 'node:fs';

const file = process.argv[2] || 'results.csv';
const max = parseInt(process.argv[3] || '20', 10);
const REGIAO = process.env.EXTRACT_REGIAO || '';

export function parseCSV(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  return '55' + d;
}

function cidadeDoEndereco(endereco, fallback) {
  const m = String(endereco || '').match(/,\s*([^,–-]+?)\s*-\s*[A-Z]{2}\s*,/);
  if (m) return m[1].trim();
  return fallback ? fallback.replace(/\s+(SP|RJ|MG|PR|SC|RS|BA|GO|DF|ES|PE|CE|MA|PA|MT|MS|AL|SE|PI|RN|PB|RO|AC|AM|RR|AP|TO)\s*$/i, '').trim() : null;
}

const isMain = process.argv[1] && process.argv[1].endsWith('insert-leads.js');
if (isMain) {
  if (!fs.existsSync(file)) { console.log('Sem results.csv — nada a inserir.'); process.exit(0); }
  const rows = parseCSV(fs.readFileSync(file, 'utf8'));
  if (rows.length < 2) { console.log('CSV vazio.'); process.exit(0); }
  const header = rows[0].map(h => String(h).trim().toLowerCase());
  const col = (...n) => header.findIndex(h => n.includes(h));
  const iNome = col('title', 'name', 'nome'), iTel = col('phone', 'telefone', 'phone_number');
  const iEnd = col('complete_address', 'address', 'endereco'), iNota = col('review_rating', 'rating');
  const iPlace = col('place_id');
  if (iTel === -1) { console.log('CSV sem coluna de telefone.'); process.exit(0); }
  const val = (r, i) => (i >= 0 && r[i] != null ? String(r[i]).trim() : '');

  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);
  await sql`create table if not exists leads (
    id bigserial primary key, nome text not null, telefone text not null unique,
    cidade text, endereco text, avaliacao numeric, place_id text unique,
    created_at timestamptz not null default now())`;

  let novos = 0, atualizados = 0, invalidos = 0, vistos = 0;
  for (const r of rows.slice(1)) {
    if (vistos >= max) break;
    const telefone = normalizePhone(val(r, iTel));
    if (!telefone) { invalidos++; continue; }
    vistos++;
    const nome = val(r, iNome) || 'Empresa';
    const endereco = val(r, iEnd) || null;
    const cidade = cidadeDoEndereco(endereco, REGIAO);
    const avaliacao = parseFloat(val(r, iNota).replace(',', '.')) || null;
    const placeId = val(r, iPlace) || null;

    const existe = placeId
      ? await sql`select id from leads where telefone = ${telefone} or place_id = ${placeId} limit 1`
      : await sql`select id from leads where telefone = ${telefone} limit 1`;

    if (existe.length) {
      await sql`update leads set
          nome = ${nome},
          cidade = coalesce(leads.cidade, ${cidade}),
          endereco = coalesce(leads.endereco, ${endereco}),
          avaliacao = coalesce(leads.avaliacao, ${avaliacao}),
          place_id = coalesce(leads.place_id, ${placeId})
        where id = ${existe[0].id}`;
      atualizados++; console.log('Já existia:', nome, telefone);
    } else {
      await sql`insert into leads (nome, telefone, cidade, endereco, avaliacao, place_id)
        values (${nome}, ${telefone}, ${cidade}, ${endereco}, ${avaliacao}, ${placeId})`;
      novos++; console.log('Novo:', nome, telefone);
    }
  }
  console.log(`Resumo — novos: ${novos} | já existiam: ${atualizados} | sem telefone válido: ${invalidos}`);
}
