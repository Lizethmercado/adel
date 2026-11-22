const TOKEN_KEY = 'adel.sessionToken';

export function readSessionToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function saveSessionToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function login(correo, contrasena) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ correo, contrasena }),
  });

  const data = await response.json().catch(() => null);

  if (response.status === 401) {
    throw new Error('Credenciales incorrectas.');
  }

  if (response.status === 400) {
    throw new Error(data?.mensaje || 'Completa el correo y la contraseña.');
  }

  if (
    response.status !== 200 ||
    typeof data?.token !== 'string' ||
    !data.token.trim()
  ) {
    throw new Error('No fue posible iniciar sesión. Inténtalo nuevamente.');
  }

  return data.token;
}

export async function getCurrentSession(token, signal) {
  const response = await fetch('/api/auth/me', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (response.status === 401) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (
    response.status !== 200 ||
    typeof data?.usuario?.nombreCompleto !== 'string' ||
    typeof data?.negocio?.nombre !== 'string'
  ) {
    throw new Error('No fue posible verificar tu sesión.');
  }

  return data;
}