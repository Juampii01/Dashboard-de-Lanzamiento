/**
 * Stub type declaration for the legacy `react-pdf` package.
 *
 * `@types/react-pdf` (installed as a transitive dep) is a broken stub with an
 * empty `main` field and no actual `.d.ts` file, which causes TS2688.
 * We use `@react-pdf/renderer` which ships its own types — this stub satisfies
 * TypeScript's implicit-type-library resolution without polluting the namespace.
 */
export {};
