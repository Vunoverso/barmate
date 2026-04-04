type SupabaseAuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

export function getSupabaseAuthErrorMessage(error: unknown, fallback = 'Nao foi possivel autenticar agora.'): string {
  const authError = error as SupabaseAuthErrorLike | null;
  const code = authError?.code || '';
  const message = (authError?.message || '').toLowerCase();

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }

  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Conta criada, mas o e-mail ainda nao foi confirmado.';
  }

  if (code === 'weak_password' || message.includes('password')) {
    return 'Senha fraca. Use pelo menos 6 caracteres.';
  }

  if (code === 'user_already_exists' || message.includes('already registered') || message.includes('already been registered')) {
    return 'Este e-mail ja esta cadastrado.';
  }

  if (code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return 'Muitas tentativas. Aguarde e tente novamente.';
  }

  if (message.includes('email')) {
    return 'E-mail invalido.';
  }

  return fallback;
}