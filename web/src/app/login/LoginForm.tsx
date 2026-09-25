'use client';

import { useActionState } from 'react';
import { login, type LoginState } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  return (
    <form action={action} className="login-card">
      <h1>SmartLogBook</h1>
      <p className="muted">כניסה ללוגבוק</p>
      {state?.error && <p className="login-error" role="alert">{state.error}</p>}
      <label className="field">
        <span>סיסמה</span>
        <input type="password" name="password" autoComplete="current-password" required autoFocus />
      </label>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'בודק…' : 'כניסה'}
      </button>
    </form>
  );
}
