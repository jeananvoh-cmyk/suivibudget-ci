declare module '*/verify-supabase-readonly.mjs' {
  export const createGuardedFetch: (
    allowedMethods?: string[],
    timeoutMs?: number,
  ) => (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

  export const guardedFetch: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;

  export function runReadOnlyVerification(): Promise<{
    pass: boolean;
    results: Array<{ table: string; status: number; ok: boolean; rows: number | null; errorCode: string | null }>;
  }>;
}
