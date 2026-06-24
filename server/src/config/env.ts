const requiredEnv = {
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
}

const port = Number(process.env.PORT ?? process.env.API_PORT ?? '4000')
const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const env = {
  port: Number.isFinite(port) && port > 0 ? port : 4000,
  corsOrigins,
  databaseUrl: process.env.DATABASE_URL ?? '',
  supabaseUrl: requiredEnv.supabaseUrl ?? '',
  supabaseAnonKey: requiredEnv.supabaseAnonKey ?? '',
}

export function assertEnv(): void {
  const missing: string[] = []

  if (!env.supabaseUrl) missing.push('SUPABASE_URL')
  if (!env.supabaseAnonKey) missing.push('SUPABASE_ANON_KEY')

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }
}
