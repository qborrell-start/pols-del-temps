# Pols del Temps — extensió per a Firefox

Un rellotge generatiu dins d'un popup de Firefox (**Manifest V3**). L'hora es veu com una flor: els **pètals** són les hores, les **llavors** daurades són els minuts i les **partícules** són els segons. L'usuari pot personalitzar-la i l'extensió **recorda** la configuració i l'estat de l'animació cada cop que s'obre.



## Característiques

- **Flor viva:** un pètal per hora (format de 12 hores); el de l'hora actual creix minut a minut. Una llavor nova per minut (angle auri de 137°) i partícules amb moviment orgànic que espurnegen cada segon.
- **Controls del DOM** (estils a `style.css`), en tres grups:
  - **Flor:** mida.
  - **Partícules:** quantitat, velocitat i color.
  - **Pol·len** (les llavors): color.
  - Caselles per **aturar les partícules** i **amagar l'hora**; botó de **paleta** (Clàssica, Nit, Tardor) i **Restableix**.
- **Estat persistent:** ajustos i moviment de les partícules es guarden amb `storeItem()` i es recuperen amb `getItem()`.

## Instal·lació (per provar-la)

1. Clona o descarrega el repositori. Ja inclou `p5.min.js` (p5.js 2.3.4) i `OpenSans.ttf`: Manifest V3 no permet carregar scripts d'un CDN, per això van dins de la carpeta.
2. A Firefox, obre `about:debugging#/runtime/this-firefox`.
3. Clica **Carrega un complement temporal…** i tria el fitxer `manifest.json`.
4. Clica la icona de la flor a la barra d'eines.

Si `p5.min.js` falta, descarrega <https://cdn.jsdelivr.net/npm/p5@2.3.4/lib/p5.min.js> i desa'l com a `p5.min.js` al costat de `popup.html` (el popup mostra un missatge si no el troba). Sense `OpenSans.ttf` es fa servir la font del navegador.

Per veure errors: botó **Inspecciona** de l'extensió a `about:debugging`.

## Estructura

| Fitxer | Funció |
|---|---|
| `manifest.json` | Manifest V3: acció amb popup, icones i permís `storage` |
| `popup.html` | Pàgina del popup (carrega `style.css`, `p5.min.js` i `sketch.js`) |
| `sketch.js` | Animació, controls del DOM i guardar/recuperar dades |
| `style.css` | Estils dels controls i del popup |
| `p5.min.js` | Llibreria p5.js 2.3.4, en local |
| `OpenSans.ttf` | Font del text del llenç |
| `icons/` | Icones de 48 i 96 px |

## Com es mantenen les dades

Un popup es crea en obrir-lo i es destrueix en tancar-lo, així que cal guardar l'estat. Totes les claus porten el prefix `polsDelTemps.`:

| Clau | Què guarda |
|---|---|
| `zoom`, `particleCount`, `particleSpeed`, `particleColor`, `pollenColor`, `palette`, `paused`, `showInfo` | Ajustos dels controls |
| `particleClock` | «Rellotge propi» de les partícules: el moviment continua d'on era |

Es recupera a `setup()` (`loadSavedData()`) i es guarda en moure un control, cada segon i en tancar el popup (`pagehide`). La flor, les llavors i els pètals depenen de l'hora real i no cal guardar-los.

## El permís `storage`

El manifest declara `"permissions": ["storage"]`.

- `storeItem()`/`getItem()` de p5.js són embolcalls de `localStorage`; funcionen al popup sense cap permís (comprovat, vegeu sota).
- El permís `storage` habilita l'API d'extensions `browser.storage`; sense ell, `browser.storage` no existeix.
- Es manté perquè `browser.storage.local` és el sistema pensat per a extensions i és l'única via d'emmagatzematge dels scripts de fons (que no tenen `localStorage`).

**Com comprovar-ho:** carrega l'extensió, obre `moz-extension://<UUID>/popup.html` en una pestanya (l'UUID surt a `about:debugging`), prem F12 i, a la consola, escriu `typeof browser.storage`. Treu `"storage"` del manifest, torna a carregar l'extensió i repeteix.

Resultats obtinguts a Firefox (complement temporal):

| Prova | Esperat | Obtingut |
|---|---|---|
| Amb permís: `typeof browser.storage` | `"object"` | `"object"` ✔ |
| Sense permís: `typeof browser.storage` | `"undefined"` | `"undefined"` ✔ |
| Sense permís: els ajustos es mantenen en reobrir | Sí | Sí ✔ |

## Llicència

[MIT](LICENSE) © 2026 Queralt Borrell. Les llicències dels components de tercers (p5.js, Open Sans) són a [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
