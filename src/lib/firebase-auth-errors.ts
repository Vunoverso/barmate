type FirebaseAuthErrorLike = {
  code?: string;
  message?: string;
  customData?: {
    _tokenResponse?: {
      error?: {
        message?: string;
      };
    };
    _serverResponse?: {
      error?: {
        message?: string;
      };
    };
  };
  error?: {
    message?: string;
  };
};

function parseBackendMessageFromText(text?: string): string | null {
  if (!text) return null;

  const directMatch = text.match(/CONFIGURATION_NOT_FOUND|EMAIL_NOT_FOUND|INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS|USER_DISABLED|TOO_MANY_ATTEMPTS_TRY_LATER/);
  if (directMatch) return directMatch[0];

  const jsonStart = text.indexOf('{');
  if (jsonStart === -1) return null;

  try {
    const parsed = JSON.parse(text.slice(jsonStart));
    const nestedMessage = parsed?.error?.message;
    return typeof nestedMessage === 'string' ? nestedMessage : null;
  } catch {
    return null;
  }
}

export function getFirebaseAuthErrorCode(error: unknown): string {
  const authError = error as FirebaseAuthErrorLike | null;
  const backendMessage =
    authError?.customData?._tokenResponse?.error?.message ||
    authError?.customData?._serverResponse?.error?.message ||
    authError?.error?.message ||
    parseBackendMessageFromText(authError?.message);

  if (backendMessage) return backendMessage;
  if (typeof authError?.code === 'string' && authError.code) return authError.code;

  return 'unknown';
}

export function getFirebaseAuthErrorMessage(error: unknown, fallback = 'Nao foi possivel autenticar agora.'): string {
  const code = getFirebaseAuthErrorCode(error);

  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail invalido.';
    case 'auth/user-disabled':
    case 'USER_DISABLED':
      return 'Usuario desativado.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
      return 'E-mail ou senha incorretos.';
    case 'auth/too-many-requests':
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'Muitas tentativas. Aguarde e tente novamente.';
    case 'auth/email-already-in-use':
      return 'Este e-mail ja esta cadastrado.';
    case 'auth/weak-password':
      return 'Senha fraca. Use pelo menos 6 caracteres.';
    case 'CONFIGURATION_NOT_FOUND':
    case 'auth/configuration-not-found':
      return 'Login indisponivel: o Firebase Auth deste projeto nao esta configurado corretamente no ambiente publicado.';
    default:
      return fallback;
  }
}