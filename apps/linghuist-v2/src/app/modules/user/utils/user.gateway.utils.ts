import { WsException } from '@nestjs/websockets';

export function requireSocketString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new WsException(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new WsException(`${fieldName} is required`);
  }

  return trimmed;
}

export function requireSocketBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new WsException(`${fieldName} must be a boolean`);
  }

  return value;
}
