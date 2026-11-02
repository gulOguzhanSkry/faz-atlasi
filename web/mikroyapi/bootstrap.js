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
  'kup.scope':['Şematik · temsili ölçek (önceki östenit tanesi ≈40 µm, lamel aralığı ≈0,5 µm varsayıldı) · kütle paylarının çizimi. İnce çizgiler tane sınırlarıdır, yeni faz değildir. Kinetik veya ölçülmüş mikrograf değildir.','Schematic · representative scale (prior-austenite grain ≈40 µm, lamellar spacing ≈0.5 µm assumed) · drawing of mass fractions. Thin lines are grain boundaries, not a new phase. Not kinetic, not a measured micrograph.'],
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
  'kup.magnification':['Büyütme · temsili ölçek çubuğu kesitte','Magnification · representative scale bar on the section'],
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
  'kup.lesson.label':['Rehberli anlatım','Guided lesson'],
  'kup.lesson.prev':['← Önceki','← Previous'],
  'kup.lesson.next':['Sonraki →','Next →'],
  'kup.lesson.lattice.short':['Kafes','Lattice'],
  'kup.lesson.cell.short':['Birim hücre','Unit cell'],
  'kup.lesson.interstices.short':['Arayerler','Interstices'],
  'kup.lesson.compare.short':['γ ile α','γ vs α'],
  'kup.lesson.free.short':['Serbest','Free'],
  'kup.lesson.lattice.title':['Kafes: aynı hücrenin tekrarı','Lattice: one cell, repeated'],
  'kup.lesson.cell.title':['Birim hücre: atomları say','Unit cell: count the atoms'],
  'kup.lesson.interstices.title':['Arayerler: C nereye girer?','Interstices: where does C go?'],
  'kup.lesson.compare.title':['Neden γ daha çok C çözer?','Why does γ dissolve more C?'],
  'kup.lesson.free.title':['Serbest inceleme','Free exploration'],
  'kup.lesson.lattice.body':['Kristal, aynı birim hücrenin üç yönde tekrarıdır. Burada 2×2×2 hücre görünüyor; çizgiler hücre sınırlarıdır.','A crystal is one unit cell repeated in three directions. Shown: 2×2×2 cells; lines are cell boundaries.'],
  'kup.lesson.latticeC.body':['Sementit (Fe₃C) ortorombik bir ara bileşiktir: Fe ve C belirli konumlarda, sabit 3:1 oranında dizilir. Burada 2×2×2 hücre görünüyor.','Cementite (Fe₃C) is an orthorhombic intermediate compound: Fe and C sit on fixed sites in a fixed 3:1 ratio. Shown: 2×2×2 cells.'],
  'kup.lesson.cell.body':['Köşedeki atom 8 hücreye, kenardaki 4 hücreye, yüzdeki 2 hücreye paylaşılır. Hücrenin içinde kalan parça opak, dışarıdaki kısım soluk çizildi. Parçaları topla: hücredeki net atom sayısı.','A corner atom is shared by 8 cells, an edge atom by 4, a face atom by 2. The part inside the cell is opaque, the rest faint. Add the parts: the net atoms per cell.'],
  'kup.lesson.cellC.body':['Sementit hücresindeki bütün atomlar hücrenin içindedir; paylaşım yoktur. Sarı küreler C atomlarıdır.','All atoms of the cementite cell lie inside it; nothing is shared. Yellow spheres are C atoms.'],
  'kup.lesson.interstices.body':['Fe atomları arasında iki tür boşluk vardır: 6 Fe ile çevrili oktahedral (turkuaz küre) ve 4 Fe ile çevrili tetrahedral (mor dörtyüzlü). YMK’de en büyük boşluk oktahedraldir ve C oraya girer. Fe küçültüldü; boşluklar ve C ideal ölçekte.','There are two kinds of gap between Fe atoms: octahedral, surrounded by 6 Fe (teal spheres), and tetrahedral, surrounded by 4 Fe (purple tetrahedra). In FCC the largest gap is octahedral and C sits there. Fe is shrunk; voids and C are to ideal scale.'],
  'kup.lesson.intersticesBcc.body':['HMK’de tetrahedral boşluk oktahedralden biraz büyüktür; yine de C oktahedral konumda durur. Orada yalnız 2 Fe’yi (turuncu) iter, diğer 4 Fe (gri) uzaktadır; kafes tek yönde gerilir. Fe küçültüldü; boşluklar ve C ideal ölçekte.','In BCC the tetrahedral void is slightly larger than the octahedral one, yet C sits on the octahedral site: there it pushes only 2 Fe (orange) while the other 4 (grey) are far away, so the lattice strains in one direction. Fe is shrunk; voids and C are to ideal scale.'],
  'kup.lesson.compare.body':['Solda γ (YMK), sağda α (HMK); ikisi de ≈912 °C kafes parametreleriyle aynı Å ölçeğinde. Sarı küre C atomu, turkuaz küreler oktahedral boşluklardır.','Left γ (FCC), right α (BCC), both on one Å scale using lattice parameters at ≈912 °C. The yellow sphere is a C atom; teal spheres are octahedral voids.'],
  'kup.lesson.free.body':['Hücre tekrarını, fazın karbon oranına göre C sayımını ve arayerleri aşağıdaki seçeneklerle serbestçe incele.','Explore cell repeats, the carbon count for the phase composition, and interstices with the options below.'],
  'kup.badge.reference':['Kristalografik referans','Crystallographic reference'],
  'kup.badge.ideal':['İdeal sert küre geometrisi','Ideal hard-sphere geometry'],
  'kup.badge.calculated':['Denge verisinden hesaplanan','Calculated from equilibrium data'],
  'kup.badge.conceptual':['Kavramsal','Conceptual'],
  'kup.fact.system':['{system} · koordinasyon sayısı {cn}','{system} · coordination number {cn}'],
  'kup.fact.corner':['{n} köşe × ⅛','{n} corners × ⅛'],
  'kup.fact.edge':['{n} kenar × ¼','{n} edges × ¼'],
  'kup.fact.face':['{n} yüz × ½','{n} faces × ½'],
  'kup.fact.body':['{n} iç × 1','{n} inside × 1'],
  'kup.fact.count':['= {total} Fe atomu / hücre','= {total} Fe atoms / cell'],
  'kup.fact.apf':['Atomik dolgu oranı {apf}: hacmin %{pct}’i atomlarla dolu (ideal sert küre).','Atomic packing fraction {apf}: {pct}% of the volume is filled by atoms (ideal hard spheres).'],
  'kup.fact.cementite':['{fe} Fe + {c} C = {units} Fe₃C formül birimi / hücre','{fe} Fe + {c} C = {units} Fe₃C formula units / cell'],
  'kup.fact.holes':['Hücre başına {octa} oktahedral ve {tetra} tetrahedral arayer.','{octa} octahedral and {tetra} tetrahedral interstices per cell.'],
  'kup.fact.ratios':['Boşluk yarıçapı / Fe yarıçapı: oktahedral {ro} · tetrahedral {rt}','Void radius / Fe radius: octahedral {ro} · tetrahedral {rt}'],
  'kup.fact.neighbours':['Turuncu: a/2 uzaklıkta 2 Fe · gri: a/√2 uzaklıkta 4 Fe','Orange: 2 Fe at a/2 · grey: 4 Fe at a/√2'],
  'kup.legend.octa':['Oktahedral boşluk (küre)','Octahedral void (sphere)'],
  'kup.legend.tetra':['Tetrahedral boşluk (dörtyüzlü)','Tetrahedral void (tetrahedron)'],
  'kup.legend.carbon':['C atomu (≈0,77 Å)','C atom (≈0.77 Å)'],
  'kup.cmp.a':['Kafes parametresi (≈912 °C)','Lattice parameter (≈912 °C)'],
  'kup.cmp.octa':['Oktahedral boşluk yarıçapı','Octahedral void radius'],
  'kup.cmp.tetra':['Tetrahedral boşluk yarıçapı','Tetrahedral void radius'],
  'kup.cmp.carbon':['C atomu (kovalent, yaklaşık)','C atom (covalent, approx.)'],
  'kup.cmp.max':['En yüksek C çözünürlüğü (bu atlasın verisi)','Maximum C solubility (this atlas’ data)'],
  'kup.cmp.conclusion':['C iki kafeste de boşluktan büyüktür; ama γ’nın oktahedral boşluğu α’nınkinin yaklaşık {ratio} katıdır. Bu yüzden γ, C’yi çok daha az zorlanarak çözer: %{g} C’ye karşı %{a} C.','C is larger than the voids in both lattices, but γ’s octahedral void is about {ratio}× α’s. So γ takes C with far less strain: {g} wt% C versus {a} wt% C.'],
  'kup.cmp.source':['Kafes parametreleri: Basinski, Hume-Rothery & Sutton (1955). Boşluklar ideal sert küre modelidir.','Lattice parameters: Basinski, Hume-Rothery & Sutton (1955). Voids follow the ideal hard-sphere model.'],
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
 dialog.innerHTML=`<div class="kup-shell"><header class="kup-head"><div><span class="kup-eyebrow">OG / Fe–Fe₃C</span><h2 id="kupTitle">${esc(t('kup.title'))}</h2></div><button type="button" data-kup-minimise autofocus>${esc(t('kup.minimise'))}</button></header><div class="kup-live" data-kup-summary role="status"></div><div class="kup-workspace"><aside class="kup-controls"><div class="kup-point" data-kup-point></div>${field('kup.scale',select('scale',[['volume','kup.volume'],['atomic','kup.atomic']]))}<div data-kup-volume-controls>${field('kup.colors',select('colors',[['phases','kup.phases'],['constituents','kup.constituents'],['grains','kup.grains']]))}${field('kup.quality',select('quality',[['economy','kup.economy'],['balanced','kup.balanced'],['fine','kup.fine'],['maximum','kup.maximum']]))}<fieldset class="kup-axis"><legend>${esc(t('kup.cut'))}</legend>${['x','y','z'].map(a=>`<label><input type="radio" name="kupAxis" value="${a}" ${a==='z'?'checked':''}>${a.toUpperCase()}</label>`).join('')}</fieldset>${field('kup.depth','<input type="range" min="0.02" max="1" step="0.01" value="1" data-kup-depth><output data-kup-depth-value>1.00</output>')}</div><div data-kup-atomic-controls hidden>${field('kup.phase',select('phase',['G','A','D','C','L'].map(c=>[c,'kup.'+c])))}<div class="kup-lesson-steps" data-kup-lesson role="toolbar" aria-label="${esc(t('kup.lesson.label'))}"></div><div data-kup-free-controls>${field('kup.cells',select('repeat',[['auto','kup.auto'],['1','kup.cells'],['2','kup.cells'],['3','kup.cells']]))}${['carbon','holes','neighbours','volumes','compact'].map((name,i)=>`<label class="kup-check"><input type="checkbox" data-kup-${name} ${i===0?'checked':''}>${esc(t('kup.'+name))}</label>`).join('')}</div><p class="kup-atom-description" data-kup-atom-description></p><p data-kup-atom-counts></p><p class="kup-note">${esc(t('kup.atomDiscrete'))}</p><p class="kup-note">${esc(t('kup.atomScope'))}</p><a class="kup-source" data-kup-atom-source target="_blank" rel="noopener">${esc(t('kup.source'))}</a></div><div class="kup-playback">${field('kup.temperature',`<input type="number" min="${D.meta.T_min}" max="${D.meta.T_max}" step="0.1" data-kup-temperature>`)}<div>${['heat','cool','stop'].map(action=>`<button type="button" data-kup-play="${action}">${esc(t('kup.'+action))}</button>`).join('')}</div><p>${esc(t('kup.playScope'))}</p></div><div class="kup-legend" data-kup-legend></div></aside><main class="kup-stage"><div class="kup-volume-view"><div class="kup-viewport" data-kup-viewport></div><div class="kup-camera">${['left','right','in','out','reset'].map(action=>`<button type="button" data-kup-camera="${action}">${esc(t('kup.'+action))}</button>`).join('')}<button type="button" data-kup-full>${esc(t('kup.full'))}</button></div></div><aside class="kup-lesson-card" data-kup-lesson-card hidden aria-live="polite"></aside><section class="kup-section-view" data-kup-section-view><header><h3>${esc(t('kup.section'))}</h3><button type="button" data-kup-export>${esc(t('kup.export'))}</button></header><div class="kup-section-tools">${field('kup.sectionMode',select('section-mode',[['phases','kup.phases'],['constituents','kup.constituents'],['grains','kup.grains'],['etched','kup.etched']]))}${field('kup.magnification',select('magnification',[['low','kup.low'],['medium','kup.medium'],['high','kup.high']]))}<label class="kup-check"><input type="checkbox" checked data-kup-effects>${esc(t('kup.effects'))}</label></div><canvas data-kup-slice width="512" height="512"></canvas><p class="kup-note kup-section-caption" data-kup-section-caption></p><p class="kup-note" data-kup-section-warning></p></section></main></div><footer class="kup-foot">${esc(t('kup.scope'))}</footer></div>`;
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
       loading??=import('./kup.js?v=1.3.0');const module=await loading;
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
