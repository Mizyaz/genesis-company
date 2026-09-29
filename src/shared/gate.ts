/** One loading screen for every change of page and every wait: the first load, large images, the signal flight.
 * `SiliconGate` (in the site shell) draws it; anything else only asks for it here. */
export type GateRequest = {
  /** A label from the TR dictionary; the gate translates it. */
  title: string;
  subtitle?: string;
  /** Milliseconds to wait before showing, so a quick load never flashes the screen. */
  delay?: number;
};
export type GateJob = GateRequest & { id: number; state: 'pending' | 'done'; reveal?: () => void };

let jobs: GateJob[] = [];
let serial = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export function subscribeGate(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const gateJobs = () => jobs;

/** Keep the gate closed until the returned `release` is called; its `reveal` runs as the gate opens. */
export function holdGate(request: GateRequest) {
  const job: GateJob = { ...request, id: ++serial, state: 'pending' };
  jobs = [...jobs, job];
  emit();
  return (reveal?: () => void) => {
    if (job.state === 'done') return;
    job.state = 'done';
    job.reveal = reveal;
    if (!listeners.size) { settleGate([job]); reveal?.(); return; } // No gate on this page: reveal at once.
    jobs = [...jobs];
    emit();
  };
}

/** The gate calls this once it has opened for finished jobs. */
export function settleGate(finished: GateJob[]) {
  jobs = jobs.filter(job => !finished.includes(job));
  emit();
}

/** Change page through the gate, exactly like following a link. */
export function navigate(hash: string) {
  const handled = !window.dispatchEvent(new CustomEvent('genesis:gate-navigate', { detail: hash, cancelable: true }));
  if (!handled) window.location.hash = hash;
}
