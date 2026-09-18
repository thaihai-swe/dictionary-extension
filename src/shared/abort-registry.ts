export class AbortRegistry {
  private readonly controllers = new Map<string, AbortController>();

  register(key: string, conflictPrefix?: string): AbortController {
    const existing = this.controllers.get(key);
    if (existing) return existing;
    if (conflictPrefix) this.cancelPrefix(conflictPrefix, key);
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller;
  }

  unregister(key: string): void {
    this.controllers.delete(key);
  }

  cancelPrefix(prefix: string, exceptKey = ''): void {
    for (const [key, controller] of this.controllers.entries()) {
      if (!key.startsWith(prefix) || key === exceptKey) continue;
      controller.abort();
      this.controllers.delete(key);
    }
  }

  cancelAll(): void {
    for (const controller of this.controllers.values()) controller.abort();
    this.controllers.clear();
  }

  get size(): number {
    return this.controllers.size;
  }
}
