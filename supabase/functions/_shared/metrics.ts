/**
 * Minimal metrics stubs with zero dependencies
 * Prevents denopkg.com import errors in Supabase Edge Functions
 */

export type Labels = Record<string, string>;

export class Counter { 
  private v = 0; 
  constructor(public name: string, public help = "") {} 
  inc(_?: Labels) { this.v++; } 
  get() { return this.v; } 
}

export class Gauge { 
  private v = 0; 
  constructor(public name: string, public help = "", public buckets?: number[]) {} 
  set(n: number, _?: Labels) { this.v = n; } 
  get() { return this.v; } 
}

export class Histogram { 
  private a: number[] = []; 
  constructor(public name: string, public help = "", public buckets?: number[]) {} 
  observe(n: number, _?: Labels) { this.a.push(n); } 
  get() { return this.a; } 
}

export function startTimer() { 
  const t0 = performance.now(); 
  return () => (performance.now() - t0) / 1000; // Return number directly, not object
}

export function exportMetrics(): string {
  // Minimal stub - returns empty metrics
  return "";
}
