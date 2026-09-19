export class GenerationGate {
  private value = 0;

  next(): number {
    this.value += 1;
    return this.value;
  }

  invalidate(): number {
    return this.next();
  }

  isCurrent(token: number): boolean {
    return token === this.value;
  }

  current(): number {
    return this.value;
  }
}
