-- Extrator de Leads — tabela única (Etapa 2: rodar uma vez no Neon)
create table if not exists leads (
  id         bigserial primary key,
  nome       text not null,
  telefone   text not null unique,
  cidade     text,
  endereco   text,
  avaliacao  numeric,
  place_id   text unique,
  created_at timestamptz not null default now()
);
