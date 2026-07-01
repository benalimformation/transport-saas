/**
 * Centralized permissions management for Transport SaaS
 * Single source of truth for role-based access control
 */

// Define available roles
export type Role = "super_admin" | "admin" | "exploitant" | "chauffeur" | "client";

// Role constants for better readability and maintainability
export const ROLES = {
  SUPER_ADMIN: "super_admin" as Role,
  ADMIN: "admin" as Role,
  EXPLOITANT: "exploitant" as Role,
  CHAUFFEUR: "chauffeur" as Role,
  CLIENT: "client" as Role,
};

// Permission rules by module
export const MODULE_PERMISSIONS = {
  // Admin modules
  admin: [ROLES.SUPER_ADMIN],
  utilisateurs: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Business modules
  clients: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EXPLOITANT],
  devis: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EXPLOITANT, ROLES.CLIENT],
  livraisons: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EXPLOITANT, ROLES.CHAUFFEUR],
  factures: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EXPLOITANT, ROLES.CLIENT],
  depenses: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EXPLOITANT],
  chauffeurs: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EXPLOITANT, ROLES.CHAUFFEUR],
  camions: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EXPLOITANT, ROLES.CHAUFFEUR],
  planning: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EXPLOITANT],
  rentabilite: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EXPLOITANT],
  dashboard: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EXPLOITANT, ROLES.CHAUFFEUR, ROLES.CLIENT],
};

/**
 * Check if a user role is authorized to access a module
 * @param role - User's role
 * @param module - Module name
 * @returns boolean - Authorization status
 */
export function isAuthorized(role: Role | null, module: keyof typeof MODULE_PERMISSIONS): boolean {
  if (!role) return false;
  return MODULE_PERMISSIONS[module].includes(role);
}

/**
 * Get dashboard cards configuration for a specific role
 * @param role - User's role
 * @returns Array of dashboard card configurations
 */
export function getDashboardCardsForRole(role: Role | null) {
  // Define all possible dashboard cards with their permissions
  const DASHBOARD_CARDS = [
    {
      href: "/clients",
      title: "Clients",
      subtitle: "Gérer les clients",
      allowedRoles: MODULE_PERMISSIONS.clients
    },
    {
      href: "/devis",
      title: "Devis",
      subtitle: "Créer et suivre les devis",
      allowedRoles: MODULE_PERMISSIONS.devis
    },
    {
      href: "/livraisons",
      title: "Livraisons",
      subtitle: "Suivre les livraisons",
      allowedRoles: MODULE_PERMISSIONS.livraisons
    },
    {
      href: "/factures",
      title: "Factures",
      subtitle: "Suivre les paiements",
      allowedRoles: MODULE_PERMISSIONS.factures
    },
    {
      href: "/depenses",
      title: "Dépenses",
      subtitle: "Suivre les coûts de transport",
      allowedRoles: MODULE_PERMISSIONS.depenses
    },
    {
      href: "/chauffeurs",
      title: "Chauffeurs",
      subtitle: "Gérer les chauffeurs",
      allowedRoles: MODULE_PERMISSIONS.chauffeurs
    },
    {
      href: "/camions",
      title: "Camions",
      subtitle: "Gérer les camions",
      allowedRoles: MODULE_PERMISSIONS.camions
    },
    {
      href: "/planning",
      title: "Planning",
      subtitle: "Voir l'organisation",
      allowedRoles: MODULE_PERMISSIONS.planning
    },
    {
      href: "/rentabilite",
      title: "Rentabilité",
      subtitle: "Analyser la rentabilité",
      allowedRoles: MODULE_PERMISSIONS.rentabilite
    },
    {
      href: "/utilisateurs",
      title: "Utilisateurs",
      subtitle: "Gérer les accès",
      allowedRoles: MODULE_PERMISSIONS.utilisateurs
    },
    {
      href: "/admin",
      title: "Administration SaaS",
      subtitle: "Gérer l'administration",
      allowedRoles: MODULE_PERMISSIONS.admin
    }
  ];

  // Filter cards based on user role
  return role
    ? DASHBOARD_CARDS.filter(card => card.allowedRoles.includes(role))
    : DASHBOARD_CARDS;
}

/**
 * Get all allowed roles for a module
 * @param module - Module name
 * @returns Array of allowed roles
 */
export function getAllowedRolesForModule(module: keyof typeof MODULE_PERMISSIONS): Role[] {
  return MODULE_PERMISSIONS[module];
}

/**
 * Check if a role has admin-level privileges
 * @param role - User's role
 * @returns boolean - Admin status
 */
export function isAdminRole(role: Role | null): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

/**
 * Check if a role has read-only privileges
 * @param role - User's role
 * @returns boolean - Read-only status
 */
export function isReadOnlyRole(role: Role | null): boolean {
  return role === ROLES.CLIENT || role === ROLES.CHAUFFEUR;
}