export class ControllableStorage implements Storage {
  private readonly values = new Map<string, string>();
  private readError: Error | undefined;
  private writeError: Error | undefined;
  private removeError: Error | undefined;

  readonly getCalls: string[] = [];
  readonly setCalls: Array<{ key: string; value: string }> = [];
  readonly removeCalls: string[] = [];
  clearCalls = 0;

  constructor(seed: Readonly<Record<string, string>> = {}) {
    for (const [key, value] of Object.entries(seed)) {
      this.values.set(key, value);
    }
  }

  get length() {
    return this.values.size;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key: string) {
    this.getCalls.push(key);
    if (this.readError) throw this.readError;
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.setCalls.push({ key, value });
    if (this.writeError) throw this.writeError;
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.removeCalls.push(key);
    if (this.removeError) throw this.removeError;
    this.values.delete(key);
  }

  clear() {
    this.clearCalls++;
    if (this.removeError) throw this.removeError;
    this.values.clear();
  }

  seed(key: string, value: string) {
    this.values.set(key, value);
  }

  failReads(error = new Error("Storage read failed")) {
    this.readError = error;
  }

  failWrites(error = new Error("Storage write failed")) {
    this.writeError = error;
  }

  failRemovals(error = new Error("Storage remove failed")) {
    this.removeError = error;
  }

  clearFailures() {
    this.readError = undefined;
    this.writeError = undefined;
    this.removeError = undefined;
  }
}
