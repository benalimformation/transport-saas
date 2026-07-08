/**
 * Helper for generating status badge classes
 * Provides consistent styling for status badges across the application
 */

export function getStatusBadgeClass(status: string | null): string {
  // Common base classes for all badges
  const baseClasses = "rounded-full px-3 py-1 text-sm font-bold text-white";

  // Status color mapping
  if (!status) {
    return `${baseClasses} bg-slate-600`;
  }

  // Devis status colors
  if (status === "Brouillon") return `${baseClasses} bg-gray-600`;
  if (status === "Envoyé") return `${baseClasses} bg-blue-600`;
  if (status === "Accepté") return `${baseClasses} bg-green-600`;
  if (status === "Refusé") return `${baseClasses} bg-red-600`;

  // Livraisons status colors
  if (status === "Prévue") return `${baseClasses} bg-purple-600`;
  if (status === "En cours") return `${baseClasses} bg-orange-600`;
  if (status === "Livrée") return `${baseClasses} bg-green-600`;

  // Factures status colors
  if (status === "Non payée") return `${baseClasses} bg-red-600`;
  if (status === "Payée") return `${baseClasses} bg-green-600`;

  // Default color for unknown statuses
  return `${baseClasses} bg-slate-600`;
}