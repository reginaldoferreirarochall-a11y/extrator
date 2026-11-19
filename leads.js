// Gera docs/leads.json a partir do Neon — é esse arquivo que a página lê.
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const leads = await sql`select nome, telefone, cidade, endereco, avaliacao
  from leads order by created_at desc`;
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/leads.json', JSON.stringify({
  generated_at: new Date().toISOString(),
  total: leads.length,
  leads,
}, null, 0));
console.log(`leads.json gerado com ${leads.length} contatos.`);
