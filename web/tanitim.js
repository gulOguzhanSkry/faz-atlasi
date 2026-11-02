/* SPDX-License-Identifier: MIT — optional, locally hosted introduction. */
'use strict';
(()=>{
 sozlukEkle({
  'tanitim.title':['Mikroyapı dönüşümünü izle · kısa tanıtım','Watch a microstructure transformation · short introduction'],
  'tanitim.scope':['%0,45 C için kaynak hesaplarıyla hazırlanmış yavaş soğuma örneği. Oynatma süresi gerçek işlem süresi değildir; görüntü şematiktir.','A slow-cooling example at 0.45 wt% C, generated from source calculations. Playback duration is not processing time; imagery is schematic.'],
  'tanitim.video':['Östenitten ferrit ve perlite şematik dönüşüm','Schematic transformation from austenite to ferrite and pearlite']
 });
 const host=document.querySelector('.diyagram-ust');if(!host)return;
 const suffix=DIL==='en'?'-en':'';
 const details=document.createElement('details');details.className='tanitim';
 details.innerHTML=`<summary>${esc(t('tanitim.title'))}</summary><video controls muted playsinline preload="none" width="1200" height="780" poster="gorseller/mikroyapi-sogume${suffix}-poster.webp" aria-label="${esc(t('tanitim.video'))}"><source src="gorseller/mikroyapi-sogume${suffix}.mp4" type="video/mp4"></video><p>${esc(t('tanitim.scope'))}</p>`;
 host.after(details);
 details.addEventListener('toggle',()=>{if(!details.open)details.querySelector('video').pause();});
})();
