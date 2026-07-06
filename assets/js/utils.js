/* ==========================================================================
   MétéoLigne — utilitaires partagés
   Sources de données : Open-Meteo (api.open-meteo.com) — gratuite, sans clé.
   ========================================================================== */

const METEO = (() => {

  /* ---------------- Mapping des codes météo OMM (WMO) ---------------- */
  // Chaque code -> { icon, label } ; certains ont une variante nocturne.
  const WMO = {
    0:  { icon:'sun',           iconNight:'moon',        label:'Ciel dégagé' },
    1:  { icon:'cloud-sun',     iconNight:'cloud-moon',  label:'Généralement clair' },
    2:  { icon:'cloud-sun',     iconNight:'cloud-moon',  label:'Partiellement nuageux' },
    3:  { icon:'cloud',         iconNight:'cloud',       label:'Couvert' },
    45: { icon:'cloud-fog',     iconNight:'cloud-fog',   label:'Brouillard' },
    48: { icon:'cloud-fog',     iconNight:'cloud-fog',   label:'Brouillard givrant' },
    51: { icon:'cloud-drizzle', iconNight:'cloud-drizzle', label:'Bruine légère' },
    53: { icon:'cloud-drizzle', iconNight:'cloud-drizzle', label:'Bruine modérée' },
    55: { icon:'cloud-drizzle', iconNight:'cloud-drizzle', label:'Bruine dense' },
    56: { icon:'cloud-drizzle', iconNight:'cloud-drizzle', label:'Bruine verglaçante légère' },
    57: { icon:'cloud-drizzle', iconNight:'cloud-drizzle', label:'Bruine verglaçante dense' },
    61: { icon:'cloud-rain',    iconNight:'cloud-rain',  label:'Pluie légère' },
    63: { icon:'cloud-rain',    iconNight:'cloud-rain',  label:'Pluie modérée' },
    65: { icon:'cloud-rain',    iconNight:'cloud-rain',  label:'Pluie forte' },
    66: { icon:'cloud-rain',    iconNight:'cloud-rain',  label:'Pluie verglaçante légère' },
    67: { icon:'cloud-rain',    iconNight:'cloud-rain',  label:'Pluie verglaçante forte' },
    71: { icon:'cloud-snow',    iconNight:'cloud-snow',  label:'Neige légère' },
    73: { icon:'cloud-snow',    iconNight:'cloud-snow',  label:'Neige modérée' },
    75: { icon:'cloud-snow',    iconNight:'cloud-snow',  label:'Neige forte' },
    77: { icon:'cloud-snow',    iconNight:'cloud-snow',  label:'Neige en grains' },
    80: { icon:'cloud-rain',    iconNight:'cloud-rain',  label:'Averses légères' },
    81: { icon:'cloud-rain',    iconNight:'cloud-rain',  label:'Averses modérées' },
    82: { icon:'cloud-rain',    iconNight:'cloud-rain',  label:'Averses violentes' },
    85: { icon:'cloud-snow',    iconNight:'cloud-snow',  label:'Averses de neige' },
    86: { icon:'cloud-snow',    iconNight:'cloud-snow',  label:'Fortes averses de neige' },
    95: { icon:'cloud-storm',   iconNight:'cloud-storm', label:'Orage' },
    96: { icon:'cloud-storm',   iconNight:'cloud-storm', label:'Orage avec grêle légère' },
    99: { icon:'cloud-storm',   iconNight:'cloud-storm', label:'Orage avec grêle forte' },
  };

  function weatherInfo(code, isDay=1){
    const w = WMO[code] || { icon:'cloud', iconNight:'cloud', label:'Données indisponibles' };
    return { icon: isDay ? w.icon : w.iconNight, label: w.label };
  }

  /* ---------------- UV index ---------------- */
  function uvInfo(uv){
    if (uv == null) return { label:'—', level:0 };
    if (uv < 3)  return { label:'Faible',      level:1 };
    if (uv < 6)  return { label:'Modéré',      level:2 };
    if (uv < 8)  return { label:'Élevé',       level:3 };
    if (uv < 11) return { label:'Très élevé',  level:4 };
    return { label:'Extrême', level:5 };
  }

  /* ---------------- Qualité de l'air — indice européen (CAMS/EEA) ---------------- */
  function euAqiInfo(aqi){
    if (aqi == null) return { label:'Non disponible', cls:'aqi-1', band:0 };
    if (aqi <= 20)  return { label:'Bon',              cls:'aqi-1', band:1 };
    if (aqi <= 40)  return { label:'Moyen',            cls:'aqi-2', band:2 };
    if (aqi <= 60)  return { label:'Dégradé',          cls:'aqi-3', band:3 };
    if (aqi <= 80)  return { label:'Mauvais',          cls:'aqi-4', band:4 };
    if (aqi <= 100) return { label:'Très mauvais',     cls:'aqi-5', band:5 };
    return { label:'Extrêmement mauvais', cls:'aqi-6', band:6 };
  }

  function aqiAdvice(band){
    const advices = {
      0:'Aucune donnée disponible pour le moment.',
      1:'La qualité de l’air est bonne. Profitez pleinement des activités extérieures.',
      2:'Qualité de l’air acceptable. Les personnes très sensibles peuvent ressentir de légers effets.',
      3:'Les personnes sensibles (asthme, âgées, enfants) devraient réduire les efforts prolongés en extérieur.',
      4:'Réduisez les activités physiques intenses en extérieur, en particulier pour les personnes sensibles.',
      5:'Limitez les sorties extérieures. Les personnes sensibles devraient rester en intérieur.',
      6:'Évitez les activités extérieures. Restez en intérieur autant que possible.',
    };
    return advices[band] || advices[0];
  }

  /* ---------------- Vent ---------------- */
  function beaufort(kmh){
    const table = [
      [1,'Calme'],[5,'Très légère brise'],[11,'Légère brise'],[19,'Petite brise'],
      [28,'Jolie brise'],[38,'Bonne brise'],[49,'Vent frais'],[61,'Grand vent frais'],
      [74,'Coup de vent'],[88,'Fort coup de vent'],[102,'Tempête'],[117,'Violente tempête']
    ];
    for(const [max,label] of table){ if(kmh < max) return label; }
    return 'Ouragan';
  }

  function windDirLabel(deg){
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
    return dirs[Math.round(((deg%360)/22.5))%16];
  }

  /* ---------------- Formatage ---------------- */
  const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday:'short', day:'numeric', month:'short' });
  const fmtDayFull = new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  const fmtHour = new Intl.DateTimeFormat('fr-FR', { hour:'2-digit', minute:'2-digit' });
  const fmtHourShort = new Intl.DateTimeFormat('fr-FR', { hour:'2-digit' });

  function round(n){ return n==null ? null : Math.round(n); }

  function visibilityLabel(m){
    if (m == null) return '—';
    if (m >= 10000) return '≥ 10 km';
    if (m >= 1000) return (m/1000).toFixed(1).replace('.0','') + ' km';
    return Math.round(m) + ' m';
  }

  function pressureTrendLabel(delta){
    if (delta == null || Math.abs(delta) < 0.6) return 'Stable';
    return delta > 0 ? 'En hausse' : 'En baisse';
  }

  /* ---------------- Stockage local (dernière ville consultée) ---------------- */
  const STORAGE_KEY = 'meteoligne_last_place';
  function saveLastPlace(place){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(place)); }catch(e){}
  }
  function getLastPlace(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)); }catch(e){ return null; }
  }

  /* ---------------- Récupération réseau (avec nouvelle tentative automatique) ---------------- */
  async function getJSON(url, retries = 2){
    for(let attempt = 0; attempt <= retries; attempt++){
      try{
        const res = await fetch(url);
        if(res.status === 503 || res.status === 504){
          // Service temporairement indisponible : nouvelle tentative après une courte pause.
          if(attempt < retries){ await new Promise(r => setTimeout(r, 700 * (attempt+1))); continue; }
          throw new Error('Service météo temporairement indisponible (503). Réessayez dans quelques instants.');
        }
        if(!res.ok) throw new Error('Erreur réseau ('+res.status+')');
        return res.json();
      }catch(err){
        if(attempt >= retries) throw err;
        await new Promise(r => setTimeout(r, 700 * (attempt+1)));
      }
    }
  }

  function debounce(fn, delay=350){
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), delay); };
  }

  return {
    weatherInfo, uvInfo, euAqiInfo, aqiAdvice, beaufort, windDirLabel,
    fmtDay, fmtDayFull, fmtHour, fmtHourShort, round, visibilityLabel, pressureTrendLabel,
    saveLastPlace, getLastPlace, getJSON, debounce
  };
})();

/* ---------------- Icône SVG (helper DOM) ---------------- */
function svgIcon(name, cls='icon'){
  return `<svg class="${cls}" aria-hidden="true"><use href="assets/img/icons.svg#icon-${name}"></use></svg>`;
}

/* ---------------- Navigation mobile + wind-lines décoratives (partagé) ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav){
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Bannière cookies / consentement simplifiée (nécessaire avant activation d'AdSense)
  const CONSENT_KEY = 'meteoligne_consent';
  const bar = document.getElementById('consent-bar');
  if (bar){
    if (localStorage.getItem(CONSENT_KEY)){
      bar.remove();
    } else {
      bar.addEventListener('click', (e) => {
        if (e.target.matches('[data-consent-accept]')){
          localStorage.setItem(CONSENT_KEY, '1');
          bar.remove();
        }
      });
    }
  }
});
