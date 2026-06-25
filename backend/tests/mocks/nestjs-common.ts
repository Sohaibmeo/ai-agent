const decorator = () => () => {};

export const Injectable = decorator;
export const Module = decorator;
export const Global = decorator;
export const Controller = decorator;
export const Get = decorator;
export const Post = decorator;
export const Put = decorator;
export const Patch = decorator;
export const Body = decorator;
export const Param = decorator;
export const Query = decorator;
export const Req = decorator;
export const UseGuards = decorator;
export const Inject = decorator;
export const forwardRef = (fn: () => unknown) => fn;
export class BadRequestException extends Error {}
export class ForbiddenException extends Error {}
export class NotFoundException extends Error {}
export class ValidationPipe {}
export interface OnModuleInit {
  onModuleInit(): void | Promise<void>;
}
export class Logger {
  constructor(private name?: string) {}
  log() {}
  warn() {}
  error() {}
}
