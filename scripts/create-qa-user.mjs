import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Charger les variables d'environnement depuis .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

try {
  const envContent = readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  const envVars = {};
  
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;
    
    const key = trimmed.substring(0, equalsIndex).trim();
    const value = trimmed.substring(equalsIndex + 1).trim();
    envVars[key] = value;
  }
  
  process.env = { ...process.env, ...envVars };
} catch (error) {
  console.error('Erreur lors du chargement de .env.local:', error.message);
  process.exit(1);
}

// Vérifier les variables requises
const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`Variable d'environnement manquante: ${varName}`);
    process.exit(1);
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Créer le client avec la service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createQaUser() {
  try {
    console.log('🚀 Création de l\'utilisateur QA...');
    
    const email = `qa-admin-${Date.now()}@test.com`;
    const password = `TestPassword${Math.random().toString(36).slice(2, 10)}!`;
    
    console.log(`📧 Email: ${email}`);
    console.log(`🔐 Mot de passe: ${password}`);
    
    // Créer l'utilisateur avec email confirmé
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nom_entreprise: 'QA TransportERP Trial Valid',
        nom_utilisateur: 'QA Admin Trial Valid'
      }
    });
    
    if (userError) {
      console.error('❌ Erreur lors de la création de l\'utilisateur:', userError);
      return null;
    }
    
    console.log('✅ Utilisateur créé avec succès');
    console.log(`📋 ID utilisateur: ${userData.user.id}`);
    
    // Attendre un moment pour que le trigger s'exécute
    console.log('⏳ Attente de l\'exécution du trigger...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Vérifier les objets créés
    console.log('\n🔍 Vérification des objets créés:');
    
    // 1. Vérifier l'entreprise
    const { data: entreprises, error: entreprisesError } = await supabase
      .from('entreprises')
      .select('*')
      .eq('email', email)
      .single();
    
    if (entreprisesError) {
      console.log('❌ Entreprise non trouvée:', entreprisesError.message);
    } else {
      console.log('✅ Entreprise créée:');
      console.log(`   ID: ${entreprises.id}`);
      console.log(`   Nom: ${entreprises.nom}`);
      console.log(`   Email: ${entreprises.email}`);
      console.log(`   subscription_status: ${entreprises.subscription_status}`);
      console.log(`   trial_started_at: ${entreprises.trial_started_at}`);
      console.log(`   trial_ends_at: ${entreprises.trial_ends_at}`);
      
      // Vérifier que trial_ends_at est environ 30 jours après trial_started_at
      if (entreprises.trial_started_at && entreprises.trial_ends_at) {
        const start = new Date(entreprises.trial_started_at);
        const end = new Date(entreprises.trial_ends_at);
        const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
        console.log(`   Différence: ${diffDays} jours`);
      }
    }
    
    // 2. Vérifier le profil
    const { data: profils, error: profilsError } = await supabase
      .from('profils')
      .select('*')
      .eq('email', email)
      .single();
    
    if (profilsError) {
      console.log('❌ Profil non trouvé:', profilsError.message);
    } else {
      console.log('✅ Profil créé:');
      console.log(`   ID: ${profils.id}`);
      console.log(`   Nom: ${profils.nom}`);
      console.log(`   Email: ${profils.email}`);
      console.log(`   Role: ${profils.role}`);
      console.log(`   Entreprise ID: ${profils.entreprise_id}`);
    }
    
    // 3. Vérifier les paramètres entreprise
    if (entreprises) {
      const { data: params, error: paramsError } = await supabase
        .from('parametres_entreprise')
        .select('*')
        .eq('entreprise_id', entreprises.id)
        .single();
      
      if (paramsError) {
        console.log('❌ Paramètres entreprise non trouvés:', paramsError.message);
      } else {
        console.log('✅ Paramètres entreprise créés:');
        console.log(`   ID: ${params.id}`);
        console.log(`   Nom: ${params.nom}`);
        console.log(`   Entreprise ID: ${params.entreprise_id}`);
      }
    }
    
    return {
      email,
      password,
      userId: userData.user.id,
      entreprise: entreprises,
      profil: profils
    };
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    return null;
  }
}

// Exécuter la création
createQaUser().then(async (result) => {
  if (!result) {
    console.log('\n❌ Échec de la création de l\'utilisateur QA');
    process.exit(1);
  }
  
  console.log('\n🎉 Création terminée avec succès!');
  console.log('\n📋 Informations de connexion:');
  console.log(`   Email: ${result.email}`);
  console.log(`   Mot de passe: ${result.password}`);
  console.log('\n⚠️  Ces informations sont temporaires et seront affichées uniquement ici.');
  
  process.exit(0);
});