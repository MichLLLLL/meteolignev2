/* ==========================================================================
   MétéoLigne — logique de la page "Qualité de l'air"
   ========================================================================== */

(() => {
  const els = {
    input: document.getElementById('citySearch'),
    btnSearch: document.getElementById('btnSearch'),
    btnGeoloc: document.getElementById('btnGeoloc'),
    autocomplete: document.getElementById('autocompleteList'),
    placeLabel: document.getElementById('placeLabel'),
    aqiBigDial: document.getElementById('aqiBigDial'),
    aqiBigBadge: document.getElementById('aqiBigBadge'),
    aqiAdviceText: document.getElementById('aqiAdviceText'),
    pollutantList: document.getElementById('pollutantList'),
  };
  let chart;

  function hhmm(iso){ const t = iso.split('T')[1]; return t.slice(0,5); }

  async function searchPlaces(query){
    if(!query || query.length < 2) return [];
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=fr&format=json`;
    const data = await METEO.getJSON(url);
    return (data.results || []).map(r => ({ name:r.name, admin1:r.admin1, country:r.country, lat:r.latitude, lon:r.longitude }));
  }

  function renderAutocomplete(list){
    if(!list.length){ els.autocomplete.hidden = true; return; }
    els.autocomplete.innerHTML = list.map((p,i) => `
      <button type="button" data-idx="${i}"><span>${p.name}${p.admin1 ? ', '+p.admin1 : ''}</span><small>${p.country || ''}</small></button>`).join('');
    els.autocomplete.hidden = false;
    [...els.autocomplete.querySelectorAll('button')].forEach((btn,i) => btn.addEventListener('click', () => {
      els.autocomplete.hidden = true; els.input.value = ''; loadPlace(list[i]);
    }));
  }

  const onInput = METEO.debounce(async () => {
    const q = els.input.value.trim();
    if(q.length < 2){ renderAutocomplete([]); return; }
    try{ renderAutocomplete(await searchPlaces(q)); }catch(e){ renderAutocomplete([]); }
  }, 350);
  els.input.addEventListener('input', onInput);
  els.input.addEventListener('keydown', async (e) => {
    if(e.key === 'Enter'){
      e.preventDefault();
      const q = els.input.value.trim(); if(q.length<2) return;
      const list = await searchPlaces(q);
      if(list.length){ els.input.value=''; renderAutocomplete([]); loadPlace(list[0]); }
    }
  });
  document.addEventListener('click', (e) => { if(!els.autocomplete.contains(e.target) && e.target !== els.input) els.autocomplete.hidden = true; });
  els.btnSearch.addEventListener('click', async () => {
    const q = els.input.value.trim(); if(q.length<2) return;
    const list = await searchPlaces(q);
    if(list.length){ els.input.value=''; renderAutocomplete([]); loadPlace(list[0]); }
  });
  els.btnGeoloc.addEventListener('click', locateUser);

  function locateUser(){
    if(!navigator.geolocation){ loadPlace(defaultPlace()); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude:lat, longitude:lon } = pos.coords;
      let name='Ma position', admin1='', country='';
      try{
        const r = await METEO.getJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`);
        name = r.city || r.locality || 'Ma position'; admin1 = r.principalSubdivision || ''; country = r.countryName || '';
      }catch(e){}
      loadPlace({ name, admin1, country, lat, lon });
    }, () => loadPlace(METEO.getLastPlace() || defaultPlace()), { timeout:8000 });
  }
  function defaultPlace(){ return { name:'Paris', admin1:'Île-de-France', country:'France', lat:48.8566, lon:2.3522 }; }

  function dial(pct, color, big, small, size=150, stroke=12){
    const r = (size/2) - stroke; const c = 2*Math.PI*r;
    const val = Math.max(0,Math.min(1,pct)) * c;
    return `
      <div class="dial" style="width:${size}px;height:${size}px;">
        <svg viewBox="0 0 ${size} ${size}">
          <circle class="track" cx="${size/2}" cy="${size/2}" r="${r}" style="stroke-width:${stroke}"></circle>
          <circle class="value" cx="${size/2}" cy="${size/2}" r="${r}" style="stroke:${color};stroke-width:${stroke};stroke-dasharray:${val} ${c}"></circle>
        </svg>
        <div class="dial-label" style="font-size:${size*0.26}px;">${big}<small style="font-size:${size*0.09}px;">${small}</small></div>
      </div>`;
  }

  const POLLUTANTS = [
    { key:'pm2_5', label:'PM2.5', unit:'µg/m³', max:75 },
    { key:'pm10', label:'PM10', unit:'µg/m³', max:100 },
    { key:'ozone', label:'Ozone (O₃)', unit:'µg/m³', max:180 },
    { key:'nitrogen_dioxide', label:'Dioxyde d\'azote (NO₂)', unit:'µg/m³', max:200 },
    { key:'sulphur_dioxide', label:'Dioxyde de soufre (SO₂)', unit:'µg/m³', max:350 },
    { key:'carbon_monoxide', label:'Monoxyde de carbone (CO)', unit:'µg/m³', max:10000 },
  ];

  async function loadPlace(place){
    METEO.saveLastPlace(place);
    els.placeLabel.textContent = `Qualité de l'air à ${place.name}${place.admin1 ? ', '+place.admin1 : ''}…`;
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.lat}&longitude=${place.lon}`
      + `&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi`
      + `&hourly=european_aqi&timezone=auto&forecast_days=2`;
    try{
      const data = await METEO.getJSON(url);
      render(place, data);
    }catch(e){
      console.error('MétéoLigne — erreur qualité de l\'air :', e);
      els.placeLabel.innerHTML = `Impossible de charger la qualité de l'air pour ${place.name}. (${e.message || e})
        <button class="btn btn-ghost" style="margin-left:8px;padding:4px 10px;font-size:12.5px;" id="btnRetryAir">Réessayer</button>`;
      document.getElementById('btnRetryAir')?.addEventListener('click', () => loadPlace(place));
    }
  }

  function render(place, data){
    els.placeLabel.textContent = `Qualité de l'air à ${place.name}${place.admin1 ? ', '+place.admin1 : ''} — mise à jour en direct`;
    const cur = data.current;
    const info = METEO.euAqiInfo(cur.european_aqi);
    const color = { 1:'#1C8A5C',2:'#6E8A1C',3:'#9A6B0A',4:'#B14A26',5:'#B22323',6:'#6C239E' }[info.band] || '#4FB4E8';

    els.aqiBigDial.innerHTML = dial(Math.min(1,(cur.european_aqi||0)/100), color, cur.european_aqi ?? '—', 'Indice EU');
    els.aqiBigBadge.innerHTML = `<div class="aqi-badge ${info.cls}" style="margin-top:8px;">${info.label}</div>
      <p class="metric-note" style="margin-top:10px;">Indice US AQI équivalent : ${cur.us_aqi ?? '—'}</p>`;
    els.aqiAdviceText.textContent = METEO.aqiAdvice(info.band);

    els.pollutantList.innerHTML = POLLUTANTS.map(p => {
      const v = cur[p.key];
      const pct = v==null ? 0 : Math.min(100,(v/p.max)*100);
      return `
        <div style="margin-bottom:14px;">
          <div class="pollutant-row" style="border-bottom:none;padding-bottom:4px;">
            <span>${p.label}</span><b>${v ?? '—'} ${p.unit}</b>
          </div>
          <div class="day-bar-track"><div class="day-bar-fill" style="left:0;width:${pct}%;"></div></div>
        </div>`;
    }).join('');

    renderChart(data.hourly, data.current.time);
  }

  function renderChart(hourly, currentTime){
    let nowIdx = hourly.time.indexOf(currentTime);
    if(nowIdx < 0) nowIdx = 0;
    const end = Math.min(hourly.time.length, nowIdx + 24);
    const labels = [], values = [];
    for(let i=nowIdx;i<end;i++){ labels.push(hhmm(hourly.time[i])); values.push(hourly.european_aqi[i]); }
    const ctx = document.getElementById('aqiChart');
    if(chart) chart.destroy();
    chart = new Chart(ctx, {
      type:'line',
      data:{ labels, datasets:[{ label:'Indice européen de qualité de l\'air', data:values, borderColor:'#26417A', backgroundColor:'rgba(38,65,122,.12)', fill:true, tension:.3, pointRadius:0, borderWidth:2 }] },
      options:{
        responsive:true,
        plugins:{ legend:{ position:'bottom', labels:{ boxWidth:12, font:{ family:'Inter', size:12 } } } },
        scales:{
          x:{ ticks:{ maxTicksLimit:12, font:{ family:'IBM Plex Mono', size:10 } }, grid:{ display:false } },
          y:{ beginAtZero:true, ticks:{ font:{ family:'IBM Plex Mono', size:10 } }, grid:{ color:'#EEF1F6' } }
        }
      }
    });
  }

  const saved = METEO.getLastPlace();
  if(saved){ loadPlace(saved); } else { locateUser(); }
})();
