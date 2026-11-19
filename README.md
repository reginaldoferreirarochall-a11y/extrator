# Extrator de Leads

Uma página só: você digita **nicho + região + quantidade**, clica em
**Extrair contatos**, espera ~2 minutos e vê a lista de lojas com telefone.

- Busca no Google Maps com o scraper open-source **gosom** (sem API paga)
- Grava no **Neon** (Postgres grátis) — telefone e place_id únicos, nunca duplica
- Página no **GitHub Pages** (`docs/index.html`), robôs no **GitHub Actions**
- Funciona sozinho, 100% na nuvem, sem PC e sem IA

## Arquivos
- `docs/index.html` — a página (única tela)
- `docs/leads.json` — a lista que a página lê (gerada pelo robô `leads.js`)
- `insert-leads.js` — lê o CSV do gosom e grava no banco, sem duplicar
- `leads.js` — gera `docs/leads.json` a partir do banco
- `schema.sql` — cria a tabela `leads` (rodar uma vez no Neon)
- `.github/workflows/extract.yml` — o robô da extração
- `.github/workflows/leads.yml` — o robô que só atualiza a lista

## Segredo necessário (GitHub → Settings → Secrets → Actions)
- `DATABASE_URL` — connection string do Neon (nunca vai pro código)
