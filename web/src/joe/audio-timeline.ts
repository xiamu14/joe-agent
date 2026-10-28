export class AudioTimeline {
  private spans: { start: number; end: number; offset: number }[] = [];
  private duration = 0;
  private index = 0;

  schedule(now: number, duration: number) {
    const start = Math.max(this.spans.at(-1)?.end ?? 0, now + 0.08);
    this.spans.push({ start, end: start + duration, offset: this.duration });
    this.duration += duration;
    return start;
  }

  position(now: number) {
    while (this.index + 1 < this.spans.length && this.spans[this.index + 1].start <= now) this.index++;
    const span = this.spans[this.index];
    return span && now >= span.start ? span.offset + Math.min(now - span.start, span.end - span.start) : -1;
  }
}
