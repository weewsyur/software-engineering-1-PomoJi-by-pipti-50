export type PasswordRequirement = {
  id: string;
  label: string;
  met: boolean;
};

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { id: "length", label: "At least 8 characters.", met: password.length >= 8 },
    { id: "uppercase", label: "One uppercase letter.", met: /[A-Z]/.test(password) },
    { id: "lowercase", label: "One lowercase letter.", met: /[a-z]/.test(password) },
    { id: "number", label: "One number.", met: /\d/.test(password) },
    { id: "special", label: "One special character.", met: /[^A-Za-z0-9\s]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return getPasswordRequirements(password).every((requirement) => requirement.met);
}

export function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
