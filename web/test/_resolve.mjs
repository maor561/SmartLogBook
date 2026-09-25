// Registers test/_hooks.mjs (see package.json "test").
import { register } from 'node:module';
register('./_hooks.mjs', import.meta.url);
