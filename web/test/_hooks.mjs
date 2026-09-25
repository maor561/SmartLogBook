// Test-only resolve hook: Next-style extensionless imports ('./db' → './db.ts').
const RELATIVE = /^\.{1,2}\//;
const HAS_EXT = /\.[cm]?[jt]s$|\.json$/;

export async function resolve(spec, ctx, next) {
  try {
    return await next(spec, ctx);
  } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND' || !RELATIVE.test(spec) || HAS_EXT.test(spec)) throw e;
    for (const ext of ['.ts', '/index.ts']) {
      try { return await next(spec + ext, ctx); } catch { /* try the next one */ }
    }
    throw e;
  }
}
