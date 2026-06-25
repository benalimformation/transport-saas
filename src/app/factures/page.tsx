"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Facture = {
  id: string;
  numero: string | null;
  client: string | null;
  montant_ttc: number | null;
  statut: string | null;
  date_facture: string | null;
  date_echeance: string | null;
  date_paiement: string | null;
};

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([]);

  useEffect(() => {
    chargerFactures();
  }, []);

  async function chargerFactures() {
    const { data, error } = await supabase
      .from("factures")
      .select("*")
      .order("date_facture", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setFactures(data || []);
  }

  async function supprimerFacture(id: string) {
    if (!confirm("Supprimer cette facture ?")) return;

    const { error } = await supabase.from("factures").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    chargerFactures();
  }

  async function marquerPayee(id: string) {
    const { error } = await supabase
      .from("factures")
      .update({
        statut: "Payée",
        date_paiement: new Date().toISOString().slice(0, 10),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    chargerFactures();
  }

  function formatDate(date: string | null) {
    if (!date) return "Non renseignée";
    return new Date(date).toLocaleDateString("fr-FR");
  }

  function formatPrix(montant: number | null) {
    if (montant === null || montant === undefined) return "0.00 €";
    return `${montant.toFixed(2)} €`;
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Factures</h1>

      <a
        href="/dashboard"
        className="mb-4 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Dashboard
      </a>

      <br />

      <a
        href="/factures/nouveau"
        className="mb-8 inline-block rounded bg-green-600 px-4 py-2"
      >
        + Nouvelle facture
      </a>

      <div className="space-y-4">
        {factures.length === 0 ? (
          <p className="text-gray-400">Aucune facture pour le moment.</p>
        ) : (
          factures.map((facture) => (
            <div
              key={facture.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-5"
            >
              <h2 className="text-2xl font-bold">
                {facture.numero || "Sans numéro"}
              </h2>

              <p>Client : {facture.client || "Non renseigné"}</p>
              <p>Montant TTC : {formatPrix(facture.montant_ttc)}</p>
              <p>Date facture : {formatDate(facture.date_facture)}</p>
              <p>Échéance : {formatDate(facture.date_echeance)}</p>

              <p
                className={
                  facture.statut === "Payée"
                    ? "mt-2 font-bold text-green-400"
                    : "mt-2 font-bold text-orange-400"
                }
              >
                Statut : {facture.statut || "Non payée"}
              </p>

              {facture.date_paiement && (
                <p className="text-sm text-gray-400">
                  Payée le : {formatDate(facture.date_paiement)}
                </p>
              )}

              <div className="mt-4 flex gap-3">
                {facture.statut !== "Payée" && (
                  <button
                    onClick={() => marquerPayee(facture.id)}
                    className="rounded bg-green-600 px-4 py-2"
                  >
                    Marquer payée
                  </button>
                )}

                <button
                  onClick={() => supprimerFacture(facture.id)}
                  className="rounded bg-red-600 px-4 py-2"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}