import type { Env } from '../index';
import type { Db } from '../db';
import type { User } from '@shared';

declare module 'hono' {
  interface ContextVariableMap {
    user: User;
    db: Db;
  }
}

export type AuthContext = {
  Bindings: Env;
  Variables: {
    user: User;
    db: Db;
  };
};
