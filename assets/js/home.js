/* ==========================================================================
   MétéoLigne — logique de la page d'accueil
   API météo : Open-Meteo (https://open-meteo.com) — gratuite, sans clé.
   ========================================================================== */

(() => {
  const els = {
    heroContent: document.getElementById('heroContent'),
    metricsSection: document.getElementById('metricsSection'),
    metricsGrid: document.getElementById('metricsGrid'),
    hourlySection: document.getElementById('hourlySection'),
    hourlyStrip: document.getElementById('hourlyStrip'),
    dailyAqiSection: document.getElementById('dailyAqiSection'),
    dailyList: document.getElementById('dailyList'),
    aqiSummary: document.getElementById('aqiSummary'),
    mapSection: document.getElementById('mapSection'),
    mapBox: document.getElementById('mapBox'),
    sunCard: document.getElementById('sunCard'),
    input: document.getElementById('citySearch'),
    btnSearch: document.getElementById('btnSearch'),
    btnGeoloc: document.getElementById('btnGeoloc'),
    autocomplete: document.getElementById('autocompleteList'),
  };

  let map, marker, tempChart;

  /* ---------------- Aides de temps locales (on ne fait pas confiance au fuseau du navigateur) ---------------- */
  function parts(iso){
    const [d,t] = iso.split('T');
    const [y,mo,da] = d.split('-').map(Number);
    const [hh,mm] = t.split(':').map(Number);
    return { y, mo, da, hh, mm, noon:new Date(y, mo-1, da, 12) };
  }
  function hhmm(iso){ const p = parts(iso); return String(p.hh).padStart(2,'0')+':'+String(p.mm).padStart(2,'0'); }
  function frac(iso){ const p = parts(iso); return (p.hh*60+p.mm)/1440; }
  function dayShort(iso){ return METEO.fmtDay.format(dateOnlyNoon(iso)).replace('.',''); }
  // daily.time renvoie des dates seules ("2026-07-06", sans heure) : à distinguer des horodatages "T" (current/hourly/sunrise/sunset).
  function dateOnlyNoon(dateStr){
    const [y,mo,da] = dateStr.split('-').map(Number);
    return new Date(y, mo-1, da, 12);
  }

  /* ---------------- Géocodage ---------------- */
  async function searchPlaces(query){
    if(!query || query.length < 2) return [];
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=fr&format=json`;
    const data = await METEO.getJSON(url);
    return (data.results || []).map(r => ({
      name:r.name, admin1:r.admin1, country:r.country, lat:r.latitude, lon:r.longitude, timezone:r.timezone
    }));
  }

  function renderAutocomplete(list){
    if(!list.length){ els.autocomplete.hidden = true; els.autocomplete.innerHTML=''; return; }
    els.autocomplete.innerHTML = list.map((p,i) => `
      <button type="button" data-idx="${i}">
        <span>${p.name}${p.admin1 ? ', '+p.admin1 : ''}</span>
        <small>${p.country || ''}</small>
      </button>`).join('');
    els.autocomplete.hidden = false;
    [...els.autocomplete.querySelectorAll('button')].forEach((btn,i) => {
      btn.addEventListener('click', () => {
        els.autocomplete.hidden = true;
        els.input.value = '';
        loadPlace(list[i]);
      });
    });
  }

  const onInput = METEO.debounce(async () => {
    const q = els.input.value.trim();
    if(q.length < 2){ renderAutocomplete([]); return; }
    try{ renderAutocomplete(await searchPlaces(q)); } catch(e){ renderAutocomplete([]); }
  }, 350);
  els.input.addEventListener('input', onInput);
  els.input.addEventListener('keydown', async (e) => {
    if(e.key === 'Enter'){
      e.preventDefault();
      const q = els.input.value.trim();
      if(q.length < 2) return;
      const list = await searchPlaces(q);
      if(list.length){ els.input.value=''; renderAutocomplete([]); loadPlace(list[0]); }
    }
  });
  document.addEventListener('click', (e) => {
    if(!els.autocomplete.contains(e.target) && e.target !== els.input) els.autocomplete.hidden = true;
  });
  els.btnSearch.addEventListener('click', async () => {
    const q = els.input.value.trim();
    if(q.length < 2) return;
    const list = await searchPlaces(q);
    if(list.length){ els.input.value=''; renderAutocomplete([]); loadPlace(list[0]); }
  });

  /* ---------------- Géolocalisation ---------------- */
  els.btnGeoloc.addEventListener('click', locateUser);

  function locateUser(){
    if(!navigator.geolocation){ loadPlace(defaultPlace()); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude:lat, longitude:lon } = pos.coords;
      let name = 'Ma position', admin1='', country='';
      try{
        const r = await METEO.getJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`);
        name = r.city || r.locality || r.principalSubdivision || 'Ma position';
        admin1 = r.principalSubdivision || '';
        country = r.countryName || '';
      }catch(e){ /* silencieux : on affiche quand même la météo */ }
      loadPlace({ name, admin1, country, lat, lon });
    }, () => {
      loadPlace(METEO.getLastPlace() || defaultPlace());
    }, { timeout:8000 });
  }

  function defaultPlace(){
    return { name:'Paris', admin1:'Île-de-France', country:'France', lat:48.8566, lon:2.3522 };
  }

  /* ---------------- Chargement des données météo ---------------- */
  async function loadPlace(place){
    METEO.saveLastPlace(place);
    els.heroContent.innerHTML = `<div class="state-msg">Chargement de la météo pour ${place.name}…</div>`;
    [els.metricsSection, els.hourlySection, els.dailyAqiSection, els.mapSection].forEach(s => s.hidden = true);

    const fUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}`
      + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m`
      + `&hourly=temperature_2m,precipitation_probability,weather_code,uv_index,visibility,pressure_msl`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max`
      + `&timezone=auto&forecast_days=7&past_hours=6`;
    const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.lat}&longitude=${place.lon}`
      + `&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi&timezone=auto`;

    try{
      const [f, a] = await Promise.all([METEO.getJSON(fUrl), METEO.getJSON(aUrl).catch(()=>null)]);
      render(place, f, a);
    }catch(err){
      console.error('MétéoLigne — erreur de chargement :', err);
      els.heroContent.innerHTML = `
        <div class="state-msg error">
          Impossible de récupérer la météo pour le moment (${err.message || err}).
          <br><button class="btn btn-primary" style="margin-top:10px;" id="btnRetry">Réessayer</button>
        </div>`;
      document.getElementById('btnRetry')?.addEventListener('click', () => loadPlace(place));
    }
  }

  /* ---------------- Rendu ---------------- */
  function render(place, f, air){
    const cur = f.current, hourly = f.hourly, daily = f.daily;
    let nowIdx = hourly.time.indexOf(cur.time);
    if(nowIdx < 0) nowIdx = 6; // repli raisonnable (6h passées demandées)

    renderHero(place, cur, daily, hourly, nowIdx);
    renderMetrics(cur, hourly, daily, nowIdx);
    renderHourly(hourly, nowIdx);
    renderChart(hourly, nowIdx);
    renderDaily(daily);
    renderAqiSummary(air);
    renderMap(place);
    renderSunCard(daily, cur);

    [els.metricsSection, els.hourlySection, els.dailyAqiSection, els.mapSection].forEach(s => s.hidden = false);
  }

  function renderHero(place, cur, daily, hourly, nowIdx){
    const w = METEO.weatherInfo(cur.weather_code, cur.is_day);
    const popNow = hourly.precipitation_probability?.[nowIdx];
    els.heroContent.innerHTML = `
      <div class="fade-in">
        <div class="hero-place">${svgIcon('pin', 'icon')} ${place.name}${place.admin1 ? ', '+place.admin1 : ''}${place.country ? ' · '+place.country : ''}</div>
        <div class="hero-current">
          <div class="hero-temp-block">
            <svg class="hero-icon"><use href="assets/img/icons.svg#icon-${w.icon}"></use></svg>
            <div>
              <div class="hero-temp">${METEO.round(cur.temperature_2m)}<sup>°C</sup></div>
              <div class="hero-desc">${w.label}</div>
              <div class="hero-feels">Ressenti ${METEO.round(cur.apparent_temperature)}°C</div>
            </div>
          </div>
          <div class="hero-mini-stats">
            <div class="mini-stat"><div class="v">${METEO.round(daily.temperature_2m_max[0])}°</div><div class="l">Max jour</div></div>
            <div class="mini-stat"><div class="v">${METEO.round(daily.temperature_2m_min[0])}°</div><div class="l">Min jour</div></div>
            <div class="mini-stat"><div class="v">${METEO.round(cur.wind_speed_10m)} km/h</div><div class="l">Vent</div></div>
            <div class="mini-stat"><div class="v">${popNow ?? 0}%</div><div class="l">Pluie</div></div>
          </div>
        </div>
        <div class="hero-sun-track">
          ${svgIcon('sunrise','icon')} <span class="mono">${hhmm(daily.sunrise[0])}</span>
          <div class="sun-bar">
            <div class="sun-bar-fill" style="left:${frac(daily.sunrise[0])*100}%;width:${Math.max(0,(frac(daily.sunset[0])-frac(daily.sunrise[0]))*100)}%;"></div>
            <div class="sun-bar-dot" style="left:${Math.min(100,Math.max(0,frac(cur.time)*100))}%;"></div>
          </div>
          <span class="mono">${hhmm(daily.sunset[0])}</span> ${svgIcon('sunset','icon')}
        </div>
      </div>`;
  }

  function dial(pct, color, big, small){
    const r = 38, c = 2*Math.PI*r;
    const val = Math.max(0, Math.min(1, pct)) * c;
    return `
      <div class="dial">
        <svg viewBox="0 0 96 96">
          <circle class="track" cx="48" cy="48" r="${r}"></circle>
          <circle class="value" cx="48" cy="48" r="${r}" style="stroke:${color};stroke-dasharray:${val} ${c}"></circle>
        </svg>
        <div class="dial-label">${big}<small>${small}</small></div>
      </div>`;
  }

  function compass(deg, speed){
    return `
      <div class="compass">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--line)" stroke-width="2"></circle>
          <text x="50" y="14" text-anchor="middle" font-size="9" fill="var(--slate)" font-family="Inter">N</text>
          <text x="50" y="93" text-anchor="middle" font-size="9" fill="var(--slate)" font-family="Inter">S</text>
          <text x="8" y="53" text-anchor="middle" font-size="9" fill="var(--slate)" font-family="Inter">O</text>
          <text x="92" y="53" text-anchor="middle" font-size="9" fill="var(--slate)" font-family="Inter">E</text>
          <g class="needle" style="transform:rotate(${deg}deg)">
            <line x1="50" y1="50" x2="50" y2="16" stroke="var(--amber)" stroke-width="3" stroke-linecap="round"></line>
            <polygon points="50,10 45,20 55,20" fill="var(--amber)"></polygon>
            <circle cx="50" cy="50" r="4" fill="var(--indigo-2)"></circle>
          </g>
        </svg>
      </div>
      <p style="text-align:center;font-family:var(--font-mono);font-size:13px;margin:6px 0 0;">${METEO.round(speed)} km/h · ${METEO.windDirLabel(deg)}</p>`;
  }

  function renderMetrics(cur, hourly, daily, nowIdx){
    const uv = hourly.uv_index?.[nowIdx];
    const uvI = METEO.uvInfo(uv);
    const visibility = hourly.visibility?.[nowIdx];
    const pPast = hourly.pressure_msl?.[Math.max(0,nowIdx-3)];
    const trend = METEO.pressureTrendLabel(cur.pressure_msl - (pPast ?? cur.pressure_msl));
    const uvColor = ['#3FC79A','#3FC79A','#F5A445','#E8615A','#E8615A','#8A2BE2'][uvI.level] || '#4FB4E8';

    const cards = [
      { title:'Température ressentie', icon:'thermo',
        html:`<div class="metric-value">${METEO.round(cur.apparent_temperature)}<span>°C</span></div><p class="metric-note">Réel : ${METEO.round(cur.temperature_2m)} °C</p>` },
      { title:'Humidité', icon:'droplet',
        html:`<div class="metric-value">${METEO.round(cur.relative_humidity_2m)}<span>%</span></div>${dial((cur.relative_humidity_2m||0)/100,'#4FB4E8','','')}` },
      { title:'Vent', icon:'wind',
        html:compass(cur.wind_direction_10m||0, cur.wind_speed_10m) + `<p class="metric-note" style="text-align:center;">${METEO.beaufort(cur.wind_speed_10m)} · rafales ${METEO.round(cur.wind_gusts_10m)} km/h</p>` },
      { title:'Pression', icon:'gauge',
        html:`<div class="metric-value">${Math.round(cur.pressure_msl)}<span>hPa</span></div><p class="metric-note">${trend}</p>` },
      { title:'Indice UV', icon:'uv',
        html:dial(Math.min(1,(uv||0)/11), uvColor, METEO.round(uv) ?? '—', uvI.label) },
      { title:'Visibilité', icon:'eye',
        html:`<div class="metric-value" style="font-size:22px;">${METEO.visibilityLabel(visibility)}</div><p class="metric-note">${visibility>=10000?'Air clair':'Visibilité réduite'}</p>` },
    ];

    els.metricsGrid.innerHTML = cards.map(c => `
      <div class="card metric-card fade-in">
        <div class="metric-head">${svgIcon(c.icon)} ${c.title}</div>
        ${c.html}
      </div>`).join('');
  }

  function renderHourly(hourly, nowIdx){
    const end = Math.min(hourly.time.length, nowIdx + 24);
    let html = '';
    for(let i = nowIdx; i < end; i++){
      const isDay = 1; // approximation d'affichage horaire (icône jour par défaut, suffisant à cette échelle)
      const w = METEO.weatherInfo(hourly.weather_code[i], isDay);
      html += `
        <div class="hour-card${i===nowIdx?' is-now':''}">
          <div class="t">${i===nowIdx?'Maint.':hhmm(hourly.time[i])}</div>
          <svg class="icon"><use href="assets/img/icons.svg#icon-${w.icon}"></use></svg>
          <div class="temp">${METEO.round(hourly.temperature_2m[i])}°</div>
          <div class="pop">${hourly.precipitation_probability[i] ?? 0}%</div>
        </div>`;
    }
    els.hourlyStrip.innerHTML = html;
  }

  function renderChart(hourly, nowIdx){
    const end = Math.min(hourly.time.length, nowIdx + 48);
    const labels = [], temps = [], pops = [];
    for(let i=nowIdx;i<end;i++){ labels.push(hhmm(hourly.time[i])); temps.push(hourly.temperature_2m[i]); pops.push(hourly.precipitation_probability[i] ?? 0); }
    const ctx = document.getElementById('tempChart');
    if(tempChart) tempChart.destroy();
    tempChart = new Chart(ctx, {
      data:{
        labels,
        datasets:[
          { type:'line', label:'Température (°C)', data:temps, borderColor:'#4FB4E8', backgroundColor:'rgba(79,180,232,.12)', fill:true, tension:.35, pointRadius:0, borderWidth:2, yAxisID:'y' },
          { type:'bar', label:'Proba. précipitations (%)', data:pops, backgroundColor:'rgba(38,65,122,.18)', yAxisID:'y1', borderRadius:4, maxBarThickness:10 }
        ]
      },
      options:{
        responsive:true,
        interaction:{ mode:'index', intersect:false },
        plugins:{ legend:{ position:'bottom', labels:{ boxWidth:12, font:{ family:'Inter', size:12 } } } },
        scales:{
          x:{ ticks:{ maxTicksLimit:12, font:{ family:'IBM Plex Mono', size:10 } }, grid:{ display:false } },
          y:{ position:'left', ticks:{ callback:v=>v+'°', font:{ family:'IBM Plex Mono', size:10 } }, grid:{ color:'#EEF1F6' } },
          y1:{ position:'right', min:0, max:100, ticks:{ callback:v=>v+'%', font:{ family:'IBM Plex Mono', size:10 } }, grid:{ display:false } }
        }
      }
    });
  }

  function renderDaily(daily){
    const tmax = Math.max(...daily.temperature_2m_max);
    const tmin = Math.min(...daily.temperature_2m_min);
    const span = Math.max(1, tmax - tmin);
    els.dailyList.innerHTML = daily.time.map((t,i) => {
      const w = METEO.weatherInfo(daily.weather_code[i], 1);
      const left = ((daily.temperature_2m_min[i]-tmin)/span)*100;
      const width = Math.max(6,((daily.temperature_2m_max[i]-daily.temperature_2m_min[i])/span)*100);
      return `
        <div class="day-row">
          <div class="dname">${i===0?'Aujourd’hui':dayShort(t)}<small>${METEO.fmtDay.format(dateOnlyNoon(t)).split(' ').slice(1).join(' ')}</small></div>
          <svg class="icon"><use href="assets/img/icons.svg#icon-${w.icon}"></use></svg>
          <div class="day-bar-track"><div class="day-bar-fill" style="left:${left}%;width:${width}%;"></div></div>
          <div class="day-minmax"><span class="min">${METEO.round(daily.temperature_2m_min[i])}°</span><span>${METEO.round(daily.temperature_2m_max[i])}°</span></div>
          <div class="day-pop">${daily.precipitation_probability_max[i] ?? 0}%</div>
        </div>`;
    }).join('');
  }

  function renderAqiSummary(air){
    if(!air || !air.current){
      els.aqiSummary.innerHTML = `<p class="metric-note">Données de qualité de l'air indisponibles pour ce lieu.</p>`;
      return;
    }
    const cur = air.current;
    const info = METEO.euAqiInfo(cur.european_aqi);
    els.aqiSummary.innerHTML = `
      <div class="aqi-badge ${info.cls}">Indice ${cur.european_aqi ?? '—'} · ${info.label}</div>
      <div class="pollutant-row"><span>PM2.5</span><b>${cur.pm2_5 ?? '—'} µg/m³</b></div>
      <div class="pollutant-row"><span>PM10</span><b>${cur.pm10 ?? '—'} µg/m³</b></div>
      <div class="pollutant-row"><span>Ozone (O₃)</span><b>${cur.ozone ?? '—'} µg/m³</b></div>
      <p style="margin-top:12px;font-size:13.5px;color:var(--slate);">${METEO.aqiAdvice(info.band)}</p>`;
  }

  function renderMap(place){
    if(!map){
      map = L.map(els.mapBox, { zoomControl:true, attributionControl:true }).setView([place.lat, place.lon], 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom:18
      }).addTo(map);
      marker = L.marker([place.lat, place.lon]).addTo(map);
    } else {
      map.setView([place.lat, place.lon], 9);
      marker.setLatLng([place.lat, place.lon]);
    }
    marker.bindPopup(place.name).openPopup();
    setTimeout(()=>map.invalidateSize(), 150);
  }

  function renderSunCard(daily, cur){
    const sunrise = daily.sunrise[0], sunset = daily.sunset[0];
    const durMin = Math.round((parts(sunset).hh*60+parts(sunset).mm) - (parts(sunrise).hh*60+parts(sunrise).mm));
    els.sunCard.innerHTML = `
      <div class="metric-head">${svgIcon('sunrise')} Cycle du jour</div>
      <div class="grid grid-metrics" style="margin-top:14px;">
        <div><div class="metric-note">Lever du soleil</div><div class="metric-value" style="font-size:20px;">${hhmm(sunrise)}</div></div>
        <div><div class="metric-note">Coucher du soleil</div><div class="metric-value" style="font-size:20px;">${hhmm(sunset)}</div></div>
      </div>
      <p class="metric-note" style="margin-top:14px;">Durée du jour : ${Math.floor(durMin/60)} h ${durMin%60} min</p>
      <p class="metric-note">Indice UV maximum aujourd'hui : ${METEO.round(daily.uv_index_max[0])} (${METEO.uvInfo(daily.uv_index_max[0]).label})</p>
      <p class="metric-note">Précipitations attendues : ${daily.precipitation_sum[0]} mm</p>
    `;
  }

  /* ---------------- Démarrage ---------------- */
  const saved = METEO.getLastPlace();
  if(saved){ loadPlace(saved); } else { locateUser(); }
})();
