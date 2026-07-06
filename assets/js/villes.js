/* ==========================================================================
   MétéoLigne — comparateur météo de 12 grandes villes françaises
   Une seule requête Open-Meteo groupée (coordonnées multiples).
   ========================================================================== */

(() => {
  const CITIES = [
    { name:'Paris',       lat:48.8566, lon:2.3522 },
    { name:'Marseille',   lat:43.2965, lon:5.3698 },
    { name:'Lyon',        lat:45.7640, lon:4.8357 },
    { name:'Toulouse',    lat:43.6047, lon:1.4442 },
    { name:'Nice',        lat:43.7102, lon:7.2620 },
    { name:'Nantes',      lat:47.2184, lon:-1.5536 },
    { name:'Strasbourg',  lat:48.5734, lon:7.7521 },
    { name:'Montpellier', lat:43.6108, lon:3.8767 },
    { name:'Bordeaux',    lat:44.8378, lon:-0.5792 },
    { name:'Lille',       lat:50.6292, lon:3.0573 },
    { name:'Rennes',      lat:48.1173, lon:-1.6778 },
    { name:'Reims',       lat:49.2583, lon:4.0317 },
  ];

  let rows = [];
  let sortKey = 'temp', sortDir = -1;

  async function load(){
    const lat = CITIES.map(c=>c.lat).join(',');
    const lon = CITIES.map(c=>c.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day&timezone=auto`;
    try{
      const data = await METEO.getJSON(url);
      const list = Array.isArray(data) ? data : [data];
      rows = CITIES.map((c,i) => {
        const cur = list[i].current;
        return {
          name:c.name, temp:cur.temperature_2m, feels:cur.apparent_temperature,
          humidity:cur.relative_humidity_2m, wind:cur.wind_speed_10m, precip:cur.precipitation,
          code:cur.weather_code, isDay:cur.is_day ?? 1
        };
      });
      renderHighlights();
      renderTable();
    }catch(e){
      console.error('MétéoLigne — erreur comparateur de villes :', e);
      document.getElementById('citiesBody').innerHTML = `
        <tr><td colspan="7" class="state-msg error">
          Impossible de charger les données pour le moment (${e.message || e}).
          <br><button class="btn btn-primary" style="margin-top:10px;" id="btnRetryVilles">Réessayer</button>
        </td></tr>`;
      document.getElementById('btnRetryVilles')?.addEventListener('click', load);
    }
  }

  function renderHighlights(){
    const hottest = [...rows].sort((a,b)=>b.temp-a.temp)[0];
    const coldest = [...rows].sort((a,b)=>a.temp-b.temp)[0];
    const windiest = [...rows].sort((a,b)=>b.wind-a.wind)[0];
    const cards = [
      { label:'Ville la plus chaude', c:hottest, icon:'sun', val:METEO.round(hottest.temp)+'°C' },
      { label:'Ville la plus froide', c:coldest, icon:'cloud-snow', val:METEO.round(coldest.temp)+'°C' },
      { label:'Ville la plus ventée', c:windiest, icon:'wind', val:METEO.round(windiest.wind)+' km/h' },
    ];
    document.getElementById('highlightsGrid').innerHTML = cards.map(x => `
      <div class="card fade-in">
        <div class="metric-head">${svgIcon(x.icon)} ${x.label.toUpperCase()}</div>
        <div class="metric-value" style="margin-top:6px;">${x.c.name}</div>
        <p class="metric-note">${x.val}</p>
      </div>`).join('');
  }

  function renderTable(){
    const sorted = [...rows].sort((a,b) => {
      const map = { name:'name', cond:'code', temp:'temp', feels:'feels', wind:'wind', humidity:'humidity', precip:'precip' };
      const k = map[sortKey] || 'temp';
      if (typeof a[k] === 'string') return a[k].localeCompare(b[k]) * sortDir;
      return (a[k]-b[k]) * sortDir;
    });
    document.getElementById('citiesBody').innerHTML = sorted.map(r => {
      const w = METEO.weatherInfo(r.code, r.isDay);
      return `
        <tr>
          <td><b>${r.name}</b></td>
          <td>${svgIcon(w.icon,'icon')} <span style="vertical-align:middle;margin-left:6px;font-size:13px;">${w.label}</span></td>
          <td class="num">${METEO.round(r.temp)} °C</td>
          <td class="num">${METEO.round(r.feels)} °C</td>
          <td class="num">${METEO.round(r.wind)} km/h</td>
          <td class="num">${METEO.round(r.humidity)} %</td>
          <td class="num">${r.precip ?? 0} mm</td>
        </tr>`;
    }).join('');

    document.querySelectorAll('#citiesTable th .arrow').forEach(a => a.textContent = '');
    const activeTh = document.querySelector(`#citiesTable th[data-key="${sortKey}"] .arrow`);
    if(activeTh) activeTh.textContent = sortDir === 1 ? '▲' : '▼';
  }

  document.querySelectorAll('#citiesTable th').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if(sortKey === key){ sortDir *= -1; } else { sortKey = key; sortDir = 1; }
      renderTable();
    });
  });

  load();
})();
