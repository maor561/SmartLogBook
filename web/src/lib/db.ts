import 'server-only';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Neon over HTTP, server-side only (ADR-041). The Vercel Marketplace
// integration sets DATABASE_URL; POSTGRES_URL is its legacy alias.
let client: NeonQueryFunction<false, false> | null = null;

export function hasDb() {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    client = neon(url);
  }
  return client;
}
