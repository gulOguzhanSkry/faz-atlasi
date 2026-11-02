/* SPDX-License-Identifier: MIT — lazy, bilingual integration with Faz Atlası.
 * No Three.js/model import is requested until the visitor opens the inspector. */
'use strict';
(()=>{
 if(typeof KANCA==='undefined'||typeof FazBilesen==='undefined')return;
 sozlukEkle({
  'kup.open':['3B mikroyapıyı aç','Open 3D microstructure'],
  'kup.detail':['Detayı aç','Open detail'],
  'kup.title':['Mikroyapının içine bak','Look inside the microstructure'],
  'kup.minimise':['↙ Sol alta küçült','↙ Minimise to bottom left'],
  'kup.loading':['3B ve kesit modülleri hazırlanıyor…','Preparing 3D and section modules…'],
  'kup.unavailable':['Hesap çözülmedi. Önce diyagramda geçerli bir nokta veya değişmezde ξ seçin.','Unresolved state. Select a valid diagram point or choose ξ at an invariant.'],
  'kup.alloy':['Yalnız ikili Fe–Fe₃C. Alaşımlı kesitte kapalı.','Binary Fe–Fe₃C only. Disabled for alloy isopleths.'],
  'kup.scope':['Şematik · ölçeksiz · kütle paylarının çizimi. Kinetik veya ölçülmüş mikrograf değildir.','Schematic · unscaled · drawing of mass fractions. Not kinetics or a measured micrograph.'],
  'kup.scale':['Görünüm ölçeği','Viewing scale'],
  'kup.volume':['Tane hacmi ve kesit','Grain volume and section'],
  'kup.atomic':['Atomik yapı / kristal hücresi','Atomic structure / crystal cell'],
  'kup.colors':['Renklerin anlamı','Colour meaning'],
  'kup.phases':['Denge fazları','Equilibrium phases'],
  'kup.constituents':['Mikroyapı bileşenleri','Microconstituents'],
  'kup.grains':['Tane kimlikleri','Grain identities'],
  'kup.quality':['Çizim ayrıntısı','Drawing detail'],
  'kup.economy':['Ekonomik · 24 tane','Economy · 24 grains'],
  'kup.balanced':['Dengeli · 96 tane','Balanced · 96 grains'],
  'kup.fine':['İnce · 192 tane','Fine · 192 grains'],
  'kup.maximum':['En ince · 384 tane','Maximum · 384 grains'],
  'kup.cut':['Kesit yönü ve konumu','Section orientation and position'],
  'kup.depth':['Kesit konumu · 0–1','Section position · 0–1'],
  'kup.left':['Sola döndür','Rotate left'],
  'kup.right':['Sağa döndür','Rotate right'],
  'kup.in':['Yaklaş +','Zoom in +'],
  'kup.out':['Uzaklaş −','Zoom out −'],
  'kup.reset':['İlk görünüm','Reset view'],
  'kup.full':['Tam ekran','Full screen'],
  'kup.exitfull':['Tam ekrandan çık','Exit full screen'],
  'kup.heat':['Isıt ▷','Heat ▷'],
  'kup.cool':['Soğut ▷','Cool ▷'],
  'kup.stop':['Durdur','Stop'],
  'kup.reduced':['Hareket azaltma tercihi: oynatma kapalı. Sıcaklığı diyagramdan elle seçebilirsiniz.','Reduced motion: playback disabled. Select temperature manually in the diagram.'],
  'kup.atBoundary':['Faz sınırında duruldu. Sınırın iki yanını veya değişmezde ξ ilerlemesini inceleyin.','Stopped at a phase boundary. Inspect either side or choose ξ at an invariant.'],
  'kup.playScope':['Oynatma anlatım içindir; hız gerçek işlem süresi değildir.','Playback is illustrative; its speed is not processing time.'],
  'kup.temperature':['Sıcaklık · °C','Temperature · °C'],
  'kup.section':['Aynı hacimden 2B kesit','2D section of the same volume'],
  'kup.sectionMode':['Kesit görünümü','Section appearance'],
  'kup.etched':['Dağlanmış görünüm · temsili Nital','Etched appearance · illustrative Nital'],
  'kup.magnification':['Göreli büyütme · fiziksel ölçek değil','Relative magnification · not a physical scale'],
  'kup.low':['Düşük','Low'],'kup.medium':['Orta','Medium'],'kup.high':['Yüksek','High'],
  'kup.effects':['Yüzey ve ışık etkileri','Surface and illumination effects'],
  'kup.export':['Kesiti PNG kaydet ↓','Save section PNG ↓'],
  'kup.phase':['Kristal referans fazı','Crystal reference phase'],
  'kup.cells':['Hücre tekrarı','Cell repetitions'],
  'kup.auto':['C oranına göre otomatik','Automatic from phase carbon'],
  'kup.carbon':['C atomlarını göster','Show carbon atoms'],
  'kup.holes':['Diğer oktahedral arayerler','Other octahedral interstices'],
  'kup.neighbours':['C’nin Fe komşuları','Fe neighbours of carbon'],
  'kup.volumes':['Koordinasyon hacimleri','Coordination polyhedra'],
  'kup.compact':['Kompakt atom görünümü','Compact atom display'],
  'kup.atomScope':['Referans kristal geometrisidir; kafes genleşmesi, atom titreşimi ve difüzyon hesaplanmaz. Arayer çizimi atomun gerçek erişilebilir hacmi değildir.','Reference crystal geometry; lattice expansion, vibration and diffusion are not calculated. Interstitial drawing is not an atom’s physically accessible volume.'],
  'kup.atomPresent':['Seçili noktada bu faz bulunuyor.','This phase is present at the selected point.'],
  'kup.atomAbsent':['Referans örneği: bu faz seçili noktada bulunmuyor.','Reference example: this phase is absent at the selected point.'],
  'kup.atomCounts':['{fe} Fe + {c} C · hedef C: {target} ağ.% · temsil: {represented} ağ.%','{fe} Fe + {c} C · target C: {target} wt% · represented: {represented} wt%'],
  'kup.atomDiscrete':['Küçük hacimde atom sayısı kesiklidir; C bir atomun altındaysa zorla eklenmez. Yerleştirme bir çizim kuralıdır, atomik denge istatistiği değildir.','Atom count is discrete in a small volume; carbon is not forced in below one-atom resolution. Placement is a drawing rule, not atomic-equilibrium statistics.'],
  'kup.A':['α-ferrit · HMK / BCC','α-ferrite · BCC'],
  'kup.D':['δ-ferrit · HMK / BCC','δ-ferrite · BCC'],
  'kup.G':['γ-östenit · YMK / FCC','γ-austenite · FCC'],
  'kup.C':['Sementit · Fe₃C · ortorombik','Cementite · Fe₃C · orthorhombic'],
  'kup.L':['Sıvı · periyodik kafes yok','Liquid · no periodic lattice'],
  'kup.atom.A':['Fe köşelerde ve gövde merkezinde; C çarpık oktahedral arayerlerde. İki yakın ve dört daha uzak Fe komşusu vardır.','Fe occupies corners and body centres; C occupies distorted octahedral sites, with two near and four more distant Fe neighbours.'],
  'kup.atom.D':['δ ve α aynı HMK kafes türündedir; sıcaklıkla kafes boyutu bu referansta hesaplanmaz.','δ and α share the BCC lattice type; temperature-dependent lattice size is not calculated here.'],
  'kup.atom.G':['Fe köşelerde ve yüz merkezlerinde; C oktahedral arayerlerde bulunur. Altı eş uzaklıklı Fe komşusu vardır.','Fe occupies corners and face centres; C occupies octahedral sites, with six equidistant Fe neighbours.'],
  'kup.atom.C':['Pnma (#62), oP16 AFLOW prototipi. Bir hücrede 12 Fe + 4 C; a=5,090, b=6,748, c=4,523 Å. Seçili sıcaklık için ölçülmüş hücre değildir.','Pnma (#62), oP16 AFLOW prototype. Each cell has 12 Fe + 4 C; a=5.090, b=6.748, c=4.523 Å. Not a measured cell at the selected temperature.'],
  'kup.atom.L':['Uzun menzilli periyodik düzeni olmayan konum örneği; moleküler dinamik simülasyonu veya seçili bileşim değildir.','Nonperiodic positional example; not molecular dynamics or a representation of the selected composition.'],
  'kup.source':['Kristal yapı kaynağı ↗','Crystal structure source ↗'],
  'kup.webgl':['WebGL kullanılamıyor; aynı hesapla 2B kesiti kullanabilirsiniz.','WebGL unavailable; use the 2D section from the same calculation.'],
  'kup.failed':['Görünüm yüklenemedi. Yeniden açmayı deneyin.','The viewer could not load. Try opening it again.'],
  'kup.resize':['Ayrıntı hazırlanıyor…','Preparing detail…'],
  'kup.adaptive':['Akıcılık için yüzey örneklemesi {surface}² oldu. Faz ve bileşen hesabı değişmedi.','Surface sampling reduced to {surface}² for responsiveness. Phase and constituent calculations are unchanged.'],
  'kup.fallback':['Bu noktada bileşen yerleşimi yerine denge fazları gösteriliyor.','Equilibrium phases are shown instead of constituent placement at this point.'],
 });
 const binary=()=>!KAYNAK.alt&&!Object.values(st.alas||{}).some(v=>v!==0);
 const state=()=>globalThis.FazBilesenSecimi||{result:binary()?FazBilesen.calculate(st.C,st.T):null,carbon:st.C,temperature:st.T,binary:binary()};
 const card=document.createElement('section');card.className='kup-entry';
 card.innerHTML=`<button type="button" data-kup-open>${esc(t('kup.open'))} ↗</button><p>${esc(t('kup.scope'))}</p>`;
 document.getElementById('kBilesen')?.after(card);
 const dock=document.createElement('button');dock.className='kup-dock';dock.type='button';dock.setAttribute('aria-label',t('kup.open'));
 dock.innerHTML=`<span class="kup-dock-preview"><svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 11 105 36v49l-45 25L15 85V36Z"/><path d="M15 36 60 61l45-25M60 61v49M60 11v50M15 85l45-24 45 24"/><path d="m38 23 45 26v48M38 48v49M15 61l45 25 45-25"/></svg></span><span>${esc(t('kup.detail'))} ↗</span>`;
 document.body.append(dock);
 const dialog=document.createElement('dialog');dialog.className='kup-dialog';dialog.setAttribute('aria-labelledby','kupTitle');
 const field=(key,content)=>`<label class="kup-field"><span>${esc(t(key))}</span>${content}</label>`;
 const select=(name,values)=>`<select data-kup-${name}>${values.map(([value,key])=>`<option value="${value}">${esc(t(key))}</option>`).join('')}</select>`;
 dialog.innerHTML=`<div class="kup-shell"><header class="kup-head"><div><span class="kup-eyebrow">OG / Fe–Fe₃C</span><h2 id="kupTitle">${esc(t('kup.title'))}</h2></div><button type="button" data-kup-minimise autofocus>${esc(t('kup.minimise'))}</button></header><div class="kup-live" data-kup-summary role="status"></div><div class="kup-workspace"><aside class="kup-controls"><div class="kup-point" data-kup-point></div>${field('kup.scale',select('scale',[['volume','kup.volume'],['atomic','kup.atomic']]))}<div data-kup-volume-controls>${field('kup.colors',select('colors',[['phases','kup.phases'],['constituents','kup.constituents'],['grains','kup.grains']]))}${field('kup.quality',select('quality',[['economy','kup.economy'],['balanced','kup.balanced'],['fine','kup.fine'],['maximum','kup.maximum']]))}<fieldset class="kup-axis"><legend>${esc(t('kup.cut'))}</legend>${['x','y','z'].map(a=>`<label><input type="radio" name="kupAxis" value="${a}" ${a==='z'?'checked':''}>${a.toUpperCase()}</label>`).join('')}</fieldset>${field('kup.depth','<input type="range" min="0.02" max="1" step="0.01" value="1" data-kup-depth><output data-kup-depth-value>1.00</output>')}</div><div data-kup-atomic-controls hidden>${field('kup.phase',select('phase',['G','A','D','C','L'].map(c=>[c,'kup.'+c])))}${field('kup.cells',select('repeat',[['auto','kup.auto'],['1','kup.cells'],['2','kup.cells'],['3','kup.cells']]))}${['carbon','holes','neighbours','volumes','compact'].map((name,i)=>`<label class="kup-check"><input type="checkbox" data-kup-${name} ${i===0?'checked':''}>${esc(t('kup.'+name))}</label>`).join('')}<p class="kup-atom-description" data-kup-atom-description></p><p data-kup-atom-counts></p><p class="kup-note">${esc(t('kup.atomDiscrete'))}</p><p class="kup-note">${esc(t('kup.atomScope'))}</p><a class="kup-source" data-kup-atom-source target="_blank" rel="noopener">${esc(t('kup.source'))}</a></div><div class="kup-playback">${field('kup.temperature',`<input type="number" min="${D.meta.T_min}" max="${D.meta.T_max}" step="0.1" data-kup-temperature>`)}<div>${['heat','cool','stop'].map(action=>`<button type="button" data-kup-play="${action}">${esc(t('kup.'+action))}</button>`).join('')}</div><p>${esc(t('kup.playScope'))}</p></div><div class="kup-legend" data-kup-legend></div></aside><main class="kup-stage"><div class="kup-volume-view"><div class="kup-viewport" data-kup-viewport></div><div class="kup-camera">${['left','right','in','out','reset'].map(action=>`<button type="button" data-kup-camera="${action}">${esc(t('kup.'+action))}</button>`).join('')}<button type="button" data-kup-full>${esc(t('kup.full'))}</button></div></div><section class="kup-section-view" data-kup-section-view><header><h3>${esc(t('kup.section'))}</h3><button type="button" data-kup-export>${esc(t('kup.export'))}</button></header><div class="kup-section-tools">${field('kup.sectionMode',select('section-mode',[['phases','kup.phases'],['constituents','kup.constituents'],['grains','kup.grains'],['etched','kup.etched']]))}${field('kup.magnification',select('magnification',[['low','kup.low'],['medium','kup.medium'],['high','kup.high']]))}<label class="kup-check"><input type="checkbox" checked data-kup-effects>${esc(t('kup.effects'))}</label></div><canvas data-kup-slice width="512" height="512"></canvas><p class="kup-note kup-section-caption" data-kup-section-caption></p><p class="kup-note" data-kup-section-warning></p></section></main></div><footer class="kup-foot">${esc(t('kup.scope'))}</footer></div>`;
 document.body.append(dialog);
 // Keep explicit cell counts legible; these are numeric labels, not prose.
 dialog.querySelectorAll('[data-kup-repeat] option').forEach(o=>{if(o.value!=='auto')o.textContent=o.value+'³';});
 dialog.querySelector('[data-kup-quality]').value='fine';
 let controller=null,loading=null,opened=false;
 const summary=dialog.querySelector('[data-kup-summary]');
 const scope=()=>{const current=state();return !current.binary?t('kup.alloy'):current.result?.status!=='resolved'?t('kup.unavailable'):'';};
 function sync(){
   const current=state(),note=scope();card.querySelector('button').disabled=!current.binary;dock.disabled=!current.binary;
   card.querySelector('p').textContent=note||t('kup.scope');
   if(controller)controller.setState(current);
   document.dispatchEvent(new CustomEvent('faz-atlasi:state',{detail:current}));
 }
 async function open(){
   if(!state().binary)return;
   if(!dialog.open)dialog.showModal();opened=true;dock.hidden=true;if(!controller)summary.textContent=t('kup.loading');
   try{
     if(!controller){
       loading??=import('./kup.js');const module=await loading;
       controller=module.mountCube(dialog,{t,register:sozlukEkle,lang:DIL,getState:state,sourceData:D,selectTemperature:T=>sec(null,T),boundaries:C=>gecisler(C).map(g=>g.T)});
     }
     controller.open();controller.setState(state());
   }catch(error){console.error(error);loading=null;summary.textContent=t('kup.failed');}
 }
 function minimise(){opened=false;controller?.close();if(dialog.open)dialog.close();dock.hidden=false;controller?.dock(dock.querySelector('.kup-dock-preview'));dock.focus();}
 dock.addEventListener('click',open);card.querySelector('button').addEventListener('click',open);
 dialog.querySelector('[data-kup-minimise]').addEventListener('click',minimise);
 dialog.addEventListener('cancel',event=>{event.preventDefault();minimise();});
 dialog.addEventListener('close',()=>{if(opened)minimise();});
 document.addEventListener('faz-atlasi:open-cube',open);
 KANCA.panel.push(sync);sync();
 globalThis.FazMikroyapi={open,minimise,get controller(){return controller;}};
})();
