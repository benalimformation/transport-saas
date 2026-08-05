import { useState, useEffect } from 'react';
import { Search, Bell, Cloud, ChevronDown, User, LoaderCircle, CircleAlert, Sun, Moon, CloudSun, CloudMoon, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Fonction de traduction des rôles
const translateRole = (role: string | null): string => {
  switch (role) {
    case 'super_admin': return 'Super administrateur';
    case 'admin': return 'Administrateur';
    case 'exploitant': return 'Exploitant';
    case 'chauffeur': return 'Chauffeur';
    case 'client': return 'Client';
    default: return 'Utilisateur';
  }
};

// Fonction de salutation selon l'heure locale
const getGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Bonjour";
  if (hour >= 12 && hour < 18) return "Bon après-midi";
  return "Bonsoir";
};

// Mapping des codes météo Open-Meteo vers texte français
const weatherCodeMap: Record<number, string> = {
  0: 'Ciel dégagé',
  1: 'Principalement dégagé',
  2: 'Partiellement nuageux',
  3: 'Couvert',
  45: 'Brouillard',
  48: 'Brouillard givrant',
  51: 'Bruine légère',
  53: 'Bruine modérée',
  55: 'Bruine dense',
  56: 'Bruine verglaçante légère',
  57: 'Bruine verglaçante dense',
  61: 'Pluie légère',
  63: 'Pluie modérée',
  65: 'Pluie forte',
  66: 'Pluie verglaçante légère',
  67: 'Pluie verglaçante forte',
  71: 'Neige légère',
  73: 'Neige modérée',
  75: 'Neige forte',
  77: 'Grains de neige',
  80: 'Averses légères',
  81: 'Averses modérées',
  82: 'Averses violentes',
  85: 'Averses de neige légères',
  86: 'Averses de neige fortes',
  95: 'Orage',
  96: 'Orage avec grêle',
  99: 'Orage violent',
};

const getWeatherDescription = (code: number): string => {
  return weatherCodeMap[code] || 'Conditions inconnues';
};

// Extraction fiable de ville depuis l'adresse complète française
const extractCityFromAddress = (address: string): string | null => {
  if (!address) return null;
  
  // 1. Normaliser l'adresse : espaces multiples, retours à la ligne, virgules
  const normalized = address
    .replace(/[\r\n]+/g, ' ')      // Retours à la ligne -> espaces
    .replace(/\s+/g, ' ')          // Espaces multiples -> un seul espace
    .trim();
  
  // 2. Supprimer "France" à la fin (avec ou sans virgule)
  let cleaned = normalized.replace(/(,\s*)?France$/i, '').trim();
  
  // 3. Rechercher prioritairement le motif code postal (5 chiffres) + ville
  // Chercher dans toute la chaîne, pas seulement au début d'un segment
  // Pattern: 5 chiffres + un ou plusieurs espaces + lettres (avec accents, tirets, apostrophes)
  const postalCodeMatch = cleaned.match(/(\d{5})\s+([A-Za-zÀ-ÿ\s\-\'']+?)(?:\s*$|\s*,\s*|\s+(?:FRANCE)?$)/i);
  
  if (postalCodeMatch) {
    let cityName = postalCodeMatch[2].trim();
    
    // Nettoyer la ville : supprimer chiffres à la fin (ex: "PARIS 01" -> "PARIS")
    cityName = cityName.replace(/\s+\d+$/, '');
    
    // Vérifier que ce n'est pas un nom de rue
    if (!isStreetName(cityName)) {
      return cityName;
    }
  }
  
  // 4. Rechercher une ville sans code postal à la fin
  // Découper par espaces ou virgules
  const parts = cleaned.split(/[\s,]+/).filter(part => part.length > 0);
  
  if (parts.length > 0) {
    // Vérifier chaque partie de la fin vers le début
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      
      // La partie doit être uniquement des lettres (avec accents, tirets, apostrophes)
      // et ne pas être un code postal (5 chiffres)
      if (/^[A-Za-zÀ-ÿ\s\-\'']+$/.test(part) && !/^\d{5}$/.test(part)) {
        const possibleCity = part.trim();
        
        // Vérifier que ce n'est pas un nom de rue
        if (!isStreetName(possibleCity)) {
          return possibleCity;
        }
      }
    }
  }
  
  // 5. Fallback : chercher des motifs spéciaux
  // Exemple: "13008 Marseille" -> "Marseille"
  const standaloneCityMatch = cleaned.match(/\b([A-Za-zÀ-ÿ\s\-\']+?)(?:\s*$|\s*,\s*)/i);
  if (standaloneCityMatch) {
    const possibleCity = standaloneCityMatch[1].trim();
    if (!isStreetName(possibleCity) && possibleCity.length > 1) {
      return possibleCity;
    }
  }
  
  // 6. Aucune ville identifiable
  return null;
};

// Fonction auxiliaire pour détecter les noms de rue
const isStreetName = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  const streetWords = [
    'rue', 'avenue', 'boulevard', 'chemin', 'route', 
    'impasse', 'place', 'allée', 'cours', 'quai', 'passage'
  ];
  
  // Vérifier si le texte commence par un numéro
  if (/^\d+/.test(text)) return true;
  
  // Vérifier si le texte contient un mot de rue
  for (const word of streetWords) {
    if (lowerText.includes(word)) return true;
  }
  
  return false;
};

// Sélection dynamique de l'icône météo selon le code et le moment de la journée
const getWeatherIcon = (weatherCode: number, isDay: boolean) => {
  const WeatherIcon = (() => {
    if (weatherCode === 0) return isDay ? Sun : Moon;
    if (weatherCode === 1 || weatherCode === 2) return isDay ? CloudSun : CloudMoon;
    if (weatherCode === 3) return Cloud;
    if (weatherCode === 45 || weatherCode === 48) return CloudFog;
    if (weatherCode >= 51 && weatherCode <= 57) return CloudDrizzle;
    if ((weatherCode >= 61 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) return CloudRain;
    if (weatherCode >= 71 && weatherCode <= 77) return CloudSnow;
    if (weatherCode >= 95 && weatherCode <= 99) return CloudLightning;
    return Cloud;
  })();
  
  return <WeatherIcon className="w-5 h-5 text-blue-400" />;
};

export default function DashboardHeader() {
  const [todayDate, setTodayDate] = useState('');
  const [userCity, setUserCity] = useState<string | null>(null);
  const [cityLoading, setCityLoading] = useState(true);
  const [cityError, setCityError] = useState(false);
  const [weatherData, setWeatherData] = useState<{
    city: string;
    temperature: number;
    description: string;
    weatherCode: number;
    isDay: boolean;
  } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);

  const [userProfile, setUserProfile] = useState<{
    nom: string | null;
    role: string | null;
    entreprise_id: string | null;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const dateStr = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    // Capitaliser la première lettre (lundi -> Lundi)
    const capitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    setTodayDate(capitalized);
  }, []);

  // Effet pour charger le profil utilisateur
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setProfileLoading(true);
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('Utilisateur non connecté:', authError);
          setUserProfile(null);
          return;
        }
        
        const { data: profil, error: profilError } = await supabase
          .from('profils')
          .select('nom, role, entreprise_id')
          .eq('id', user.id)
          .single();
        
        if (profilError) {
          console.error('Erreur lors de la récupération du profil:', profilError);
          setUserProfile(null);
        } else {
          setUserProfile({
            nom: profil?.nom || null,
            role: profil?.role || null,
            entreprise_id: profil?.entreprise_id || null
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        setUserProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchUserProfile();
  }, []);

  // Effet pour récupérer la ville de l'entreprise depuis Supabase
  useEffect(() => {
    const fetchCompanyCity = async () => {
      try {
        setCityLoading(true);
        setCityError(false);
        
        // Attendre que le profil soit chargé
        if (profileLoading || !userProfile?.entreprise_id) {
          setCityError(true);
          return;
        }
        
        // Récupérer l'adresse de l'entreprise depuis la table entreprises
        const { data: entreprise, error: entrepriseError } = await supabase
          .from('entreprises')
          .select('adresse')
          .eq('id', userProfile.entreprise_id)
          .single();
        
        let city: string | null = null;
        
        if (!entrepriseError && entreprise?.adresse) {
          const extractedCity = extractCityFromAddress(entreprise.adresse);
          if (extractedCity) {
            city = extractedCity;
          }
        }
        
        setUserCity(city);
      } catch (error) {
        console.error('Erreur lors de la récupération de la ville:', error);
        setCityError(true);
      } finally {
        setCityLoading(false);
      }
    };
    
    fetchCompanyCity();
  }, [userProfile, profileLoading]);

  // Effet pour récupérer la météo basée sur la ville de l'entreprise
  useEffect(() => {
    const fetchWeather = async () => {
      if (cityLoading || !userCity) return; // Ne pas appeler l'API si ville non configurée
      
      try {
        setWeatherLoading(true);
        setWeatherError(false);
        
        let geocodeSuccess = false;
        let latitude = 0;
        let longitude = 0;
        let name = '';
        let country = '';
        
        // Géocoder la ville de l'entreprise (userCity est garanti non-null ici)
        const cityForGeocode = userCity!;
        const encodedCity = encodeURIComponent(cityForGeocode);
        const geocodeResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodedCity}&count=1&language=fr&format=json&countryCode=FR`
        );
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.results && geocodeData.results.length > 0) {
            ({ latitude, longitude, name, country } = geocodeData.results[0]);
            geocodeSuccess = true;
          }
        }
        
        if (!geocodeSuccess) {
          throw new Error('Géocodage échoué');
        }
        
        // Récupération des données météo avec is_day
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&timezone=auto`
        );
        
        if (!weatherResponse.ok) throw new Error('Météo échouée');
        
        const weatherData = await weatherResponse.json();
        const isDay = weatherData.current.is_day === 1;
        
        setWeatherData({
          city: `${name}, ${country}`,
          temperature: Math.round(weatherData.current.temperature_2m),
          description: getWeatherDescription(weatherData.current.weather_code),
          weatherCode: weatherData.current.weather_code,
          isDay,
        });
      } catch (error) {
        console.error('Erreur météo:', error);
        setWeatherError(true);
      } finally {
        setWeatherLoading(false);
      }
    };
    
    fetchWeather();
  }, [userCity, cityLoading]); // Dépend de userCity et cityLoading
  return (
    <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Partie gauche - Salutation et météo */}
        <div className="flex items-center space-x-6">
          <div>
            <h1 className="text-xl font-bold text-white">
              {profileLoading ? (
                <span className="animate-pulse">Chargement...</span>
              ) : userProfile?.nom ? (
                `${getGreeting()}, ${userProfile.nom}`
              ) : (
                `${getGreeting()}, Utilisateur`
              )}
            </h1>
            <p className="text-sm text-gray-400">
              {todayDate} • <span className="text-green-400">En ligne</span>
            </p>
          </div>
          
          {/* Widget météo dynamique avec icône adaptative */}
          <div className="hidden md:flex items-center px-4 py-2 bg-gray-900 rounded-lg border border-gray-800">
            {/* Icône météo dynamique */}
            <div className="flex items-center mr-2">
              {cityLoading ? (
                <LoaderCircle className="w-5 h-5 text-blue-400 animate-spin" />
              ) : userCity === null ? (
                <CircleAlert className="w-5 h-5 text-yellow-400" />
              ) : weatherLoading ? (
                <LoaderCircle className="w-5 h-5 text-blue-400 animate-spin" />
              ) : weatherError ? (
                <CircleAlert className="w-5 h-5 text-yellow-400" />
              ) : weatherData ? (
                getWeatherIcon(weatherData.weatherCode, weatherData.isDay)
              ) : (
                <Cloud className="w-5 h-5 text-blue-400" />
              )}
            </div>
            
            {/* Informations météo */}
            <div className="min-w-[120px]">
              {cityLoading ? (
                <>
                  <p className="text-sm text-white animate-pulse">Localisation...</p>
                  <p className="text-xs text-gray-400 animate-pulse">•</p>
                </>
              ) : userCity === null ? (
                <>
                  <p className="text-sm text-white">Ville non configurée</p>
                  <p className="text-xs text-gray-400">Complétez l'adresse de votre entreprise</p>
                </>
              ) : weatherLoading ? (
                <>
                  <p className="text-sm text-white animate-pulse">Chargement météo...</p>
                  <p className="text-xs text-gray-400 animate-pulse">•</p>
                </>
              ) : weatherError ? (
                <>
                  <p className="text-sm text-white">{userCity}, France</p>
                  <p className="text-xs text-gray-400">Météo indisponible</p>
                </>
              ) : weatherData ? (
                <>
                  <p className="text-sm text-white">{weatherData.city}</p>
                  <p className="text-xs text-gray-400">{weatherData.description} • {weatherData.temperature}°C</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-white">{userCity}, France</p>
                  <p className="text-xs text-gray-400">Données temporairement indisponibles</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Partie droite - Recherche et notifications */}
        <div className="flex items-center space-x-4">
          {/* Champ de recherche */}
          <div className="hidden lg:flex items-center bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 w-64">
            <Search className="w-4 h-4 text-gray-500 mr-3" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="bg-transparent border-none text-sm text-white placeholder-gray-500 focus:outline-none w-full"
            />
          </div>

          {/* Bouton recherche mobile */}
          <button className="lg:hidden p-2 bg-gray-900 rounded-lg border border-gray-800">
            <Search className="w-5 h-5 text-gray-400" />
          </button>

          {/* Notifications */}
          <button className="relative p-2 bg-gray-900 rounded-lg border border-gray-800 hover:bg-gray-800 transition-colors">
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* Séparateur */}
          <div className="h-6 w-px bg-gray-800"></div>

          {/* Profil utilisateur */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-white">
                {profileLoading ? (
                  <span className="animate-pulse">Chargement...</span>
                ) : userProfile?.nom ? (
                  userProfile.nom
                ) : (
                  'Utilisateur'
                )}
              </p>
              <p className="text-xs text-gray-400">
                {profileLoading ? (
                  <span className="animate-pulse">•</span>
                ) : (
                  translateRole(userProfile?.role ?? null)
                )}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Barre d'état générale - bandeau sous le header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-950 border-t border-gray-800 px-6 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              <span className="text-gray-300">Système opérationnel</span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
              <span className="text-gray-300">8 véhicules en service</span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
              <span className="text-gray-300">3 livraisons aujourd'hui</span>
            </div>
          </div>
          <div className="text-gray-400 text-xs">
            Dernière mise à jour : 15:42
          </div>
        </div>
      </div>
    </header>
  );
}