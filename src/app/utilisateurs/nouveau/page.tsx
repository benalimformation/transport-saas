"use client";
import { useState } from "react";
export default function NouvelUtilisateurPage() {
  const [nom,setNom] = useState("");
  const [email,setEmail] = useState("");
  const [role,setRole] = useState("exploitant");
  const [link,setLink] = useState("");
  const [message,setMessage] = useState("");
  const [loading,setLoading] = useState(false);
  async function inviter(e: React.FormEvent) {
    e.preventDefault();setLoading(true);setMessage("");setLink("");
    try {
      const response=await fetch("/api/utilisateurs/invitations",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({nom,email,role})
      });
      const data=await response.json();
      if(!response.ok) throw new Error(data.error || "Invitation impossible.");
      setLink(data.link);setMessage("Invitation creee. Transmettez le lien en prive au collaborateur.");
    } catch(err) {setMessage(err instanceof Error ? err.message : "Erreur.");}
    finally {setLoading(false);}
  }
  return <main className="min-h-screen bg-gray-950 p-10 text-white">
    <h1 className="mb-8 text-4xl font-bold">Inviter un collaborateur</h1>
    <a href="/utilisateurs" className="mb-6 inline-block text-green-400">← Retour Utilisateurs</a>
    <form onSubmit={inviter} className="max-w-xl space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-6">
      <label className="block">Nom<input required minLength={2} maxLength={150} value={nom} onChange={e=>setNom(e.target.value)} className="mt-1 w-full rounded bg-gray-800 p-3"/></label>
      <label className="block">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded bg-gray-800 p-3"/></label>
      <label className="block">Rôle<select value={role} onChange={e=>setRole(e.target.value)} className="mt-1 w-full rounded bg-gray-800 p-3">
        <option value="admin">Administrateur</option><option value="exploitant">Exploitant</option><option value="chauffeur">Chauffeur</option><option value="client">Client</option>
      </select></label>
      <button disabled={loading} type="submit" className="rounded bg-green-600 px-6 py-3 disabled:opacity-50">{loading?"Patientez...":"Créer une invitation"}</button>
      {message && <p role="status">{message}</p>}
      {link && <div className="break-all rounded bg-gray-800 p-3"><p>Lien personnel (à conserver confidentiel) :</p><a className="text-green-400 underline" href={link}>{link}</a><button type="button" onClick={()=>navigator.clipboard.writeText(link)} className="ml-3 rounded bg-gray-700 px-3 py-1">Copier</button></div>}
    </form>
  </main>;
}
