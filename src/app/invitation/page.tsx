"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
function InvitationForm() {
  const params=useSearchParams();const token=params.get("token")||"";
  const email=params.get("email")||"";
  const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");
  const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  const supabase=createClient();
  useEffect(()=>{ if(!/^[0-9a-f]{64}$/.test(token))setMessage("Lien invalide."); },[token]);
  async function inscrire(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");
    try{
      if(password!==confirm)throw new Error("Les mots de passe ne correspondent pas.");
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){
        const {error}=await supabase.auth.signUp({email,password,options:{data:{invitation_token:token}}});
        if(error)throw error;
        setMessage("Compte cree. Confirmez votre adresse email, connectez-vous, puis revenez sur ce lien pour activer l'acces.");
      } else {
        if(user.email?.trim().toLowerCase()!==email.trim().toLowerCase())throw new Error("Connectez-vous avec l'adresse invitee.");
        const res=await fetch("/api/utilisateurs/invitations/accepter",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
        const result=await res.json();if(!res.ok)throw new Error(result.error||"Invitation non valide.");
        setMessage("Invitation acceptee. Vous pouvez acceder a ROUTCH.");
      }
    }catch(err){setMessage(err instanceof Error?err.message:"Erreur.");}finally{setBusy(false);}
  }
  return <main className="min-h-screen bg-gray-950 p-10 text-white"><div className="mx-auto max-w-md space-y-5">
    <h1 className="text-3xl font-bold">Rejoindre ROUTCH</h1><p>Invitation pour {email}</p>
    <p>Si vous possédez déjà un compte, connectez-vous puis revenez sur ce lien.</p>
    <a className="text-green-400 underline" href="/login">Se connecter</a>
    <form onSubmit={inscrire} className="space-y-4">
      <input type="password" minLength={8} required placeholder="Choisir un mot de passe" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded bg-gray-800 p-3"/>
      <input type="password" minLength={8} required placeholder="Confirmer le mot de passe" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full rounded bg-gray-800 p-3"/>
      <button type="submit" disabled={busy||!/^[0-9a-f]{64}$/.test(token)} className="rounded bg-green-600 px-6 py-3 disabled:opacity-50">Créer mon compte ou accepter l'invitation</button>
    </form><p role="status">{message}</p></div></main>;
}
export default function InvitationPage(){return <Suspense fallback={<p>Chargement...</p>}><InvitationForm/></Suspense>;}
