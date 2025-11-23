export const Injectable = () => () => {};
export class Logger {
  constructor(private name?: string) {}
  log() {}
  warn() {}
  error() {}
}
