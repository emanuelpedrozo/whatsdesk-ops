/**
 * Utilitários de validação
 */

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validateRequired(value: string): boolean {
  return value.trim().length > 0;
}

export function validateMinLength(value: string, min: number): boolean {
  return value.trim().length >= min;
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: 'A senha deve ter pelo menos 6 caracteres' };
  }
  return { valid: true };
}

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

export function validateForm<T extends Record<string, any>>(
  data: T,
  rules: Record<keyof T, (value: any) => { valid: boolean; error?: string }>
): ValidationResult {
  const errors: Record<string, string> = {};
  let valid = true;

  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(data[field as keyof T]);
    if (!result.valid) {
      valid = false;
      if (result.error) {
        errors[field] = result.error;
      }
    }
  }

  return { valid, errors };
}
