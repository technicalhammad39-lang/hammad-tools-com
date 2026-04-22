export type AuthAction =
  | 'google_login'
  | 'email_login'
  | 'email_signup'
  | 'password_reset'
  | 'logout'
  | 'generic';

function readFirebaseAuthCode(error: unknown) {
  const code = typeof (error as any)?.code === 'string' ? (error as any).code : '';
  return code.toLowerCase().trim();
}

export function getSafeAuthErrorMessage(error: unknown, action: AuthAction = 'generic') {
  const code = readFirebaseAuthCode(error);

  if (action === 'email_login') {
    if (
      code.includes('invalid-credential') ||
      code.includes('user-not-found') ||
      code.includes('wrong-password') ||
      code.includes('invalid-email')
    ) {
      return 'Invalid email or password.';
    }
    if (code.includes('too-many-requests')) {
      return 'Too many attempts. Please try again shortly.';
    }
    if (code.includes('network-request-failed')) {
      return 'Network issue detected. Please check your connection and try again.';
    }
    return 'Unable to sign in right now. Please try again.';
  }

  if (action === 'email_signup') {
    if (code.includes('email-already-in-use')) {
      return 'This email is already registered. Please sign in instead.';
    }
    if (code.includes('weak-password')) {
      return 'Password is too weak. Use at least 6 characters.';
    }
    if (code.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (code.includes('network-request-failed')) {
      return 'Network issue detected. Please check your connection and try again.';
    }
    return 'Unable to create your account right now. Please try again.';
  }

  if (action === 'google_login') {
    if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
      return 'Google sign-in was canceled.';
    }
    if (code.includes('popup-blocked')) {
      return 'Popup was blocked. Please allow popups and try again.';
    }
    if (code.includes('network-request-failed')) {
      return 'Network issue detected. Please check your connection and try again.';
    }
    return 'Unable to sign in with Google right now. Please try again.';
  }

  if (action === 'password_reset') {
    if (code.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    return 'If this email is registered, a reset link will be sent shortly.';
  }

  if (action === 'logout') {
    return 'Unable to sign out right now. Please try again.';
  }

  return 'Something went wrong. Please try again.';
}

