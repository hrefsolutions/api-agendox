/**
 * Shared kernel: reusable, framework-agnostic building blocks that any module
 * may depend on (errors, domain primitives, application ports). It must never
 * depend on a specific feature module.
 */
export * from './errors';
export * from './domain';
export * from './application';
