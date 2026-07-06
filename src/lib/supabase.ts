import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Exibir no console informações úteis para depuração sem expor chaves sensíveis
console.log('Supabase Config:', {
  url: supabaseUrl || 'Não configurada (undefined)',
  hasAnonKey: !!supabaseAnonKey,
  anonKeyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
  anonKeyStart: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) : '',
  anonKeyEnd: supabaseAnonKey ? supabaseAnonKey.substring(supabaseAnonKey.length - 10) : '',
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL ou Anon Key não configurados. Verifique o seu arquivo .env.local (local) ou as configurações de Environment Variables na Vercel.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
