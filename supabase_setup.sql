-- SCRIPT DE CONFIGURAÇÃO DO SUPABASE (DDL, TRIGGERS, RLS E SEEDS)
-- Copie e cole este script no editor SQL do seu projeto no Supabase

-- Habilitar a extensão para geração de UUIDs
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 1. CRIAÇÃO DAS TABELAS
-- =========================================================================

-- Tabela de Perfis
create table if not exists public.perfis (
    id uuid references auth.users on delete cascade primary key,
    nome_completo text not null,
    tipo text not null check (tipo in ('aluno', 'instrutor', 'admin')),
    telefone text not null,
    data_nascimento date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Veículos
create table if not exists public.veiculos (
    id uuid default uuid_generate_v4() primary key,
    modelo text not null,
    placa text not null unique,
    tipo text not null check (tipo in ('carro', 'moto')),
    ativo boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Grades Horárias
create table if not exists public.grades_horarias (
    id uuid default uuid_generate_v4() primary key,
    instrutor_id uuid references public.perfis(id) on delete cascade not null,
    veiculo_id uuid references public.veiculos(id) on delete set null,
    dia_semana integer not null check (dia_semana between 0 and 6), -- 0: Domingo, 1: Segunda...
    hora_inicio time not null,
    hora_fim time not null,
    ativo boolean default true not null
);

-- Tabela de Agendamentos
create table if not exists public.agendamentos (
    id uuid default uuid_generate_v4() primary key,
    aluno_id uuid references public.perfis(id) on delete cascade not null,
    instrutor_id uuid references public.perfis(id) on delete cascade not null,
    veiculo_id uuid references public.veiculos(id) on delete set null,
    data date not null,
    hora_inicio time not null,
    hora_fim time not null,
    tipo_aula text not null check (tipo_aula in ('pratica_carro', 'pratica_moto', 'teorica')),
    status text default 'pendente' not null check (status in ('pendente', 'confirmado', 'cancelado', 'realizado')),
    whatsapp_status text default 'nao_enviado' not null check (whatsapp_status in ('nao_enviado', 'enviado', 'confirmado_aluno', 'recusado_aluno', 'erro')),
    mensagem_sid text,
    whatsapp_antecedencia integer default null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Garantir que a coluna whatsapp_antecedencia exista se a tabela já tiver sido criada antes
alter table public.agendamentos add column if not exists whatsapp_antecedencia integer default null;

-- =========================================================================
-- 2. TRIGGER DE SINCRONIZAÇÃO DE USUÁRIOS (AUTH -> PUBLIC)
-- =========================================================================

-- Função executada após criação de usuário no Auth do Supabase
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
language plpgsql as $$
begin
  insert into public.perfis (id, nome_completo, tipo, telefone, data_nascimento)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome_completo', 'Novo Aluno'),
    coalesce(new.raw_user_meta_data->>'tipo', 'aluno'),
    coalesce(new.raw_user_meta_data->>'telefone', ''),
    case 
      when new.raw_user_meta_data->>'data_nascimento' is not null then cast(new.raw_user_meta_data->>'data_nascimento' as date)
      else null
    end
  );
  return new;
end;
$$;

-- Trigger disparada após insert em auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- 3. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- =========================================================================

-- Habilitando RLS nas tabelas
alter table public.perfis enable row level security;
alter table public.veiculos enable row level security;
alter table public.grades_horarias enable row level security;
alter table public.agendamentos enable row level security;

-- Políticas para Perfis
drop policy if exists "Qualquer um logado pode ver perfis" on public.perfis;
create policy "Qualquer um logado pode ver perfis" on public.perfis
    for select using (auth.role() = 'authenticated');

drop policy if exists "Usuários atualizam próprio perfil" on public.perfis;
create policy "Usuários atualizam próprio perfil" on public.perfis
    for update using (auth.uid() = id);

-- Políticas para Veículos
drop policy if exists "Qualquer um logado pode ver veículos ativos" on public.veiculos;
create policy "Qualquer um logado pode ver veículos ativos" on public.veiculos
    for select using (auth.role() = 'authenticated' and ativo = true);

drop policy if exists "Apenas admins controlam veículos" on public.veiculos;
create policy "Apenas admins controlam veículos" on public.veiculos
    for all using (
        exists (
            select 1 from public.perfis 
            where id = auth.uid() and tipo = 'admin'
        )
    );

-- Políticas para Grades Horárias
drop policy if exists "Qualquer um logado pode ver grades ativas" on public.grades_horarias;
create policy "Qualquer um logado pode ver grades ativas" on public.grades_horarias
    for select using (auth.role() = 'authenticated' and ativo = true);

drop policy if exists "Apenas admins gerenciam grades" on public.grades_horarias;
create policy "Apenas admins gerenciam grades" on public.grades_horarias
    for all using (
        exists (
            select 1 from public.perfis 
            where id = auth.uid() and tipo = 'admin'
        )
    );

-- Políticas para Agendamentos
drop policy if exists "Usuário vê seus próprios agendamentos ou se for admin/instrutor" on public.agendamentos;
create policy "Usuário vê seus próprios agendamentos ou se for admin/instrutor" on public.agendamentos
    for select using (
        aluno_id = auth.uid() or 
        instrutor_id = auth.uid() or 
        exists (
            select 1 from public.perfis 
            where id = auth.uid() and tipo in ('admin', 'instrutor')
        )
    );

drop policy if exists "Alunos podem criar agendamentos para si" on public.agendamentos;
create policy "Alunos podem criar agendamentos para si" on public.agendamentos
    for insert with check (aluno_id = auth.uid());

drop policy if exists "Usuário relacionado ou admin atualiza agendamentos" on public.agendamentos;
create policy "Usuário relacionado ou admin atualiza agendamentos" on public.agendamentos
    for update using (
        aluno_id = auth.uid() or 
        instrutor_id = auth.uid() or 
        exists (
            select 1 from public.perfis 
            where id = auth.uid() and tipo = 'admin'
        )
    );

-- =========================================================================
-- 4. DADOS INICIAIS DE TESTE (SEEDS)
-- =========================================================================

-- Inserir alguns veículos para testes
insert into public.veiculos (modelo, placa, tipo, ativo) values
('Chevrolet Onix - Manual (Carro A)', 'ABC-1234', 'carro', true),
('Hyundai HB20 - Manual (Carro B)', 'XYZ-5678', 'carro', true),
('Honda CG 160 Fan (Moto A)', 'MNO-9012', 'moto', true),
('Yamaha YBR 150 Factor (Moto B)', 'PQR-3456', 'moto', true)
on conflict (placa) do nothing;

-- =========================================================================
-- 5. TABELA DE CONFIGURAÇÕES GERAIS DO SISTEMA
-- =========================================================================

create table if not exists public.configuracoes (
    chave text primary key,
    valor text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.configuracoes enable row level security;

-- Políticas de RLS para Configurações
drop policy if exists "Qualquer um logado pode ver configurações" on public.configuracoes;
create policy "Qualquer um logado pode ver configurações" on public.configuracoes
    for select using (auth.role() = 'authenticated');

drop policy if exists "Apenas admins controlam configurações" on public.configuracoes;
create policy "Apenas admins controlam configurações" on public.configuracoes
    for all using (
        exists (
            select 1 from public.perfis 
            where id = auth.uid() and tipo = 'admin'
        )
    );

-- Inserir valor padrão (24 horas de antecedência)
insert into public.configuracoes (chave, valor) values
('whatsapp_antecedencia', '24')
on conflict (chave) do nothing;

-- =========================================================================
-- 6. TABELA DE CÓDIGOS DE VERIFICAÇÃO WHATSAPP (OTP)
-- =========================================================================

create table if not exists public.otps (
    telefone text primary key,
    codigo text not null,
    expira_em timestamp with time zone not null
);

-- Habilitar RLS
alter table public.otps enable row level security;
