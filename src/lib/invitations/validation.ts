export const ROLES_INVITABLES = [
  "admin",
  "exploitant",
  "chauffeur",
  "client",
] as const;

export type RoleInvitable =
  (typeof ROLES_INVITABLES)[number];

export type InvitationValidee = {
  email: string;
  nom: string;
  role: RoleInvitable;
};

export function validerInvitation(
  valeur: unknown
): InvitationValidee | null {
  if (
    typeof valeur !== "object" ||
    valeur === null ||
    Array.isArray(valeur)
  ) {
    return null;
  }

  const donnees = valeur as Record<string, unknown>;

  if (
    typeof donnees.email !== "string" ||
    typeof donnees.nom !== "string" ||
    typeof donnees.role !== "string"
  ) {
    return null;
  }

  const email = donnees.email.trim().toLowerCase();
  const nom = donnees.nom.trim();
  const role = donnees.role;

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    nom.length < 2 ||
    nom.length > 150 ||
    !ROLES_INVITABLES.some((r) => r === role)
  ) {
    return null;
  }

  return {
    email,
    nom,
    role: role as RoleInvitable,
  };
}