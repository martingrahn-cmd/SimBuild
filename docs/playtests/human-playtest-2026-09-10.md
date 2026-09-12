# Human playtest — 2026-09-10

Status: **R10-fixar implementerade och objektivt verifierade; inväntar mänskligt omtest**. Critic-poängen är oförändrade eftersom ingen ny formell critic-runda har gjorts. Fullt ändrings- och evidensprotokoll: [human_playtest_r10.md](../builds/human_playtest_r10.md).

## Prioriterade fynd

1. **Trafik uppstår direkt på isolerad väg** (`PT-2026-09-10-01`, critical)
   - R10: **reparerad och kontraktsverifierad**. En isolerad väg utan bebyggelse eller uttrycklig kartportal ger nu 0 fordon.
   - Dense vehicle traffic appeared immediately after committing a newly built isolated road in undeveloped terrain, with no buildings or visible outside-network connection. This breaks believable demand/route causality.
   - Evidens: `shots/playtest-checkpoint-2026-09-10/human-isolated-road-instant-traffic.png`

2. **Bilar försvinner vid vanlig återvändsgata** (`PT-2026-09-10-05`, critical)
   - R10: **reparerad och kontraktsverifierad**. Tvåvägsfordon använder den omvända kanten som U-sväng; endast uttryckliga kartportaler får avsluta fordonslivscykeln.
   - Vehicles drive to an ordinary dead end and disappear at the final road node. Only explicit outside connections may despawn vehicles. Ordinary dead ends require a valid local destination or a deterministic turn-around/U-turn path back into the network.
   - Evidens: `shots/playtest-checkpoint-2026-09-10/human-dead-end-vehicles-despawn.png`

3. **Osynlig magisk el-, vatten- och avfallsförsörjning** (`PT-2026-09-10-08`, critical)
   - R10: **reparerad och kontraktsverifierad**. Hamlet har nu basanläggningarna upplåsta och visar betalda externa importer samt kostnad tills varje komplett lokal försörjning finns.
   - New cities receive implicit full power, water and garbage coverage while servicesManaged is false, but the UI does not disclose a source, capacity or cost. Power and water construction unlock at 150 population (Tiny Village, not Tiny Town). Replace the magical bootstrap with an explicit player-facing starting utility contract, preferably limited paid outside imports with visible capacity/cost, while making the required basic utility response available before shortages can block progression.

4. **Lång startladdning saknar riktig återkoppling** (`PT-2026-09-11-12`, high)
   - R10: **återkoppling implementerad och verifierad**. Skalet syntes efter 55,8 ms och verkliga initieringssteg drev mätaren till menyn efter cirka 3,16 s. Själva laddningstiden är fortfarande förbättringsbar.
   - Laddningen känns för lång. Visa appskalet och huvudmenyn så tidigt som möjligt och fortsätt sedan mot ett spelbart läge med en riktig framstegsindikator.
   - Mät kallstart till första synliga meny och till interaktivt spel. Mätaren ska drivas av verkliga steg för resurser, moduler och värld, visa aktuellt steg/fel och får inte vara en falsk loopande procentsiffra.

5. **Synligt neutralt pek-/inspektionsläge saknas** (`PT-2026-09-10-06`, high)
   - R10: **reparerad och UI-verifierad** med en synlig Select / Inspect-knapp och Escape-återgång.
   - The toolbar lacks a clearly visible neutral pointer/inspect mode. Escape technically deselects the active tool, after which world clicks select objects, but this state has no dedicated cursor button or obvious player-facing indication and competes conceptually with the pause-menu Escape behavior.

6. **Otydligt hur en väg avslutas** (`PT-2026-09-10-10`, high)
   - R10: **reparerad och UI-verifierad** med skilda instruktioner för Enter, högerklick, Ctrl-Z och Escape.
   - Road authoring completion is poorly communicated. Enter commits the full path, while right-click removes the most recent control point even though the HUD labels RMB only as Cancel. Provide clearer finish affordance and distinguish undo-last-point from cancel-tool.

7. **Bostadszonering förväxlas med husplacering** (`PT-2026-09-10-11`, high)
   - R10: **första hjälpen implementerad och UI-verifierad**. Mänskligt omtest återstår.
   - The first zoning interaction is not self-explanatory. The player selected Residential and expected direct house placement; the game does not clearly explain that zoning must be painted beside a road and buildings then grow automatically. Add contextual first-use guidance and immediate valid-cell feedback.

8. **Inledande stadstillväxt är för långsam** (`PT-2026-09-10-09`, high)
   - R10: **objektivt snabbare i deterministisk balansfixture** efter höjd inflyttning/tillväxt. Den subjektiva öppningstakten måste omtestas av spelaren.
   - The initial city growth feels too slow. Calibrate early demand, household arrival, occupancy and first-milestone timing using measured normal-play timelines. Coordinate with PT-02 so visible construction adds anticipation without further delaying the opening; allow several early sites to build concurrently and provide frequent progress feedback.
   - Observerat: Autosave reports Day 4 / April 2031; HUD population is 21, milestone remains Hamlet with Tiny Village target 150, despite a substantial built road layout and many visible completed homes.
   - Evidens: `shots/playtest-checkpoint-2026-09-10/human-slow-opening-day4-pop21.png`

9. **Hus saknar byggnationsfas** (`PT-2026-09-10-02`, high)
   - R10: **implementerad, visuellt granskad och save/load-verifierad**. Bygget ger ingen kapacitet innan färdigställande.
   - Zoned buildings appear immediately as completed structures. Add a visible construction phase between lot activation and completion, with state owned by the simulation/buildings contract and preserved through save/load.

10. **Träd skakar i stället för att vaja** (`PT-2026-09-10-03`, high)
   - R10: **tidskopplingen reparerad och verifierad** vid 1×, 4× och paus. Mänsklig rörelsebedömning återstår.
   - Trees visibly shake or vibrate instead of swaying. Verify whether foliage animation is incorrectly coupled to simulation speed or uses excessive temporal frequency/amplitude; target smooth wind-driven motion based on render time, stable across pause and simulation speeds.

11. **Bilar förvrängs på avstånd** (`PT-2026-09-10-04`, high)
   - R10: **LOD/ljusjustering implementerad och nattbild granskad**. Mänskligt omtest återstår eftersom ingen exakt matchad A/B-serie finns.
   - At long camera distance during night, vehicles lose readable silhouettes and appear stretched/merged into bright distorted clusters. Attribute separately to vehicle LOD geometry/scale, headlights and post-process bloom before changing production settings.
   - Evidens: `shots/playtest-checkpoint-2026-09-10/human-distance-vehicle-distortion.png`

12. **Syrsor är för påträngande och repetitiva** (`PT-2026-09-10-07`, high)
   - R10: **mix, nattgräns och filter sänkta samt mätverifierade**. Subjektiv lyssning återstår.
   - Birdsong is acceptable, but the current cricket ambience is irritating. Reduce its prominence, repetition and continuous presence; vary events and gate them by appropriate time of day, season and weather. Validate in the normal player mix rather than solo playback.

13. **Floden ser ut som ett hål med himmeltextur** (`PT-2026-09-11-14`, high)
   - På den breda dagsvyn läser flodfåran som ett utskuret hål i terrängen. Vattnet återger himlens moln och färg för direkt och saknar tillräckliga visuella signaler för strömmande inlandsvatten: djupgradient, egen vattenfärg, ytstruktur/rörelse och tydlig kontakt med strand och flodbank.
   - Separera först reflektion, himmelsbidrag, vattenabsorption/djup och strandövergång i en reproducerbar kamera. Ändra inte terrängens eller vattnets fysiska kontrakt enbart för en skärmbild.
   - Status: **nytt fynd, ej reparerat i R10**.
   - Evidens: `shots/playtest-checkpoint-2026-09-11/human-river-sky-hole.png` (SHA256 `7672b225db395a8a11b87736069e8a98d57b15f78c859a0e6626824cee153a27`).

14. **Natten är för mörk för normalt byggande** (`PT-2026-09-11-15`, critical)
   - Vid 18:34 i december är terräng, strand, vegetation och den obelysta delen av vägen nästan svarta. Spelaren kan inte säkert läsa höjd, markkontakt eller var nästa vägpunkt hamnar, trots att verktygsgränssnittet syns.
   - Natten ska behålla sin karaktär men ha en användbar lägstanivå för mark- och strandläsbarhet. Attribuera exponering/tonemapping, måne/himmelsljus, dimma, materialrespons och verktygets placeringsmarkering separat. Verifiera vid skymning, midnatt och vinter samt nära och långt från stadsljus.
   - Status: **nytt kritiskt spelbarhetsfynd, ej reparerat i R10**.
   - Evidens: `shots/playtest-checkpoint-2026-09-11/human-night-too-dark.png` (SHA256 `c45e9d9988cb33032bb69c83a59e4399add68d4071574c7298edbd0803ba58ba`).

15. **Markering för byggbart avstånd från väg saknas** (`PT-2026-09-11-16`, high)
   - När väg- eller zonverktyget används behöver spelvärlden visa hur långt från vägen hus kan växa. Visa byggbar remsa/zondjup och skilj tydligt på giltiga celler och celler som blockeras av vatten, lutning, korsning eller befintligt innehåll.
   - Förhandsvisningen ska komma från vägens och zoneringens verkliga placeringsregler så att markeringen aldrig lovar en byggbar yta som simuleringen sedan avvisar.
   - Status: **nytt användbarhetskrav, ej implementerat i R10**.

16. **Färdig rondell saknas trots Roundabout-kort** (`PT-2026-09-11-17`, high)
   - Gränssnittet innehåller ett `Roundabout`-kort under `Intersections`, låst bakom `avenues`, men vägverktyget använder inte `junction: roundabout` i placeringsflödet. Kortet skapar därför ingen färdig rondell och är missvisande.
   - Implementera en verklig placerbar rondellmall med storleks-/rotationsförhandsvisning, terräng- och kostnadsvalidering, anslutningspunkter, enkelriktad ring, väjningsregler och riktiga trafikvägar. Den måste använda Roads/Traffic-kontrakten och fungera med save/load, bulldoze och undo.
   - Status: **bekräftat funktionsfel från UI- och källinspektion, ej implementerat i R10**.

17. **R10 gav nästan ingen trafik i en bebodd småstad** (`PT-2026-09-11-18`, critical regression)
   - Vid cirka 22–26 invånare, flera bostäder/verksamheter och ett stort sammanhängande gatunät syns i princip inga fordon. Gles trafik är rimlig, men noll eller nästan noll gör staden död och tyder på att R10:s skydd mot trafik på tomma isolerade vägar filtrerar småstadstrafiken för hårt.
   - Behåll kravet att en helt tom isolerad väg ger exakt 0 fordon. Lägg till ett litet men synligt aktivitetsstyrt mål när verkliga boende/jobb och giltiga lokala resor finns; verifiera 0, 10, 25, 50 och 150 invånare samt dead-end/portal-kontrakten.
   - Status: **ny kritisk R10-regression, ej reparerad**.
   - Evidens: `shots/playtest-checkpoint-2026-09-11/human-small-city-no-traffic.png` (SHA256 `033dabd566dff6aa1fe187460d4a5b0c35b516b91e0b7693b763d9ba86efd5df`).

18. **Escape och kugghjulet gav ingen väg till manuell sparning** (`PT-2026-09-11-19`, critical usability regression)
   - R10:s verktygshanterare stoppade alltid Escape, även i neutralt Select/Inspect-läge. Kugghjulet öppnade Settings direkt och hoppade därför över pausmenyn med Save Game och slots.
   - Status: **reparerad och UI-verifierad**. Escape lämnar först ett aktivt verktyg; Escape i Select/Inspect öppnar pausmenyn. Kugghjulet öppnar samma pausmeny. Båda verifierade vägarna visar Save Game, Load Game och slots; produktionens 163-modulersbuild passerar.
   - Evidens: `shots/playtest-fixes-r10/ux-utilities.json`.

## Oförändrade critic-kontrollpunkter

- Spelarversion: accepterad R9u; R9v är fortsatt avvisad och återställd.
- Whole-game critic: 6.0/10 FAIL. Blind A/B r2: SimBuild 0–4 CS2.
- Ingen modul når passgränsen 8.5.
- R10 ändrar inga poäng; nästa beslut tas efter mänskligt omtest.

## Nästa arbetsordning efter R10-omtest

1. Samla spelarens omtest av öppningstakt, byggnationsfas, väg/U-svängar, fjärrtrafik, träd och ljud.
2. Reparera R10:s strypta småstadstrafik (`PT-18`) utan att återinföra fordon på helt tomma isolerade vägar.
3. Reparera nattens läsbarhet (`PT-15`) som ett spelbarhetsfel och verifiera skymning/midnatt/vinter utan att tvätta bort nattkaraktären.
4. Lägg till regelstyrd markering av byggbart zondjup längs vägar (`PT-16`) med tydliga blockerade celler.
5. Ersätt det inaktiva Roundabout-kortet med en riktig placerbar rondell (`PT-17`) och verifiera väg-/trafik-/save-/undo-kontrakten.
6. Reparera eventuella reproducerbara R10-regressioner utan att ändra critic-poäng på subjektiv känsla ensam.
7. Reproducera och attribuera flodens himmelspegling, djup/färg och strandkontakt (`PT-14`); verifiera i flera tider och kameravinklar.
8. Implementera portal/GitHub-buggrapportering när distributionsvägen väljs (`PT-13`).
9. Optimera den underliggande laddningstiden med profilerad koddelning/asset-strömning; behåll den verifierade ärliga mätaren.
10. Återgå därefter till den tidigare seed-7 Props-diagnosen innan R9v övervägs igen.

Varje punkt följer projektets befintliga flöde: implementera → kör → verifiera → fånga och granska evidens → critic → acceptera/avvisa → uppdatera STATUS/HANDOFF.
## Förslag: GitHub-publicering och buggrapportering (`PT-2026-09-11-13`)

- Projektet har redan fjärradressen `https://github.com/martingrahn-cmd/SimBuild.git`, men GitHub-grenen innehåller endast checkpointen från 2026-09-06. Den nuvarande verifierade versionen är ännu lokal.
- Behåll källkod, historik och byggautomation på GitHub, men publicera den kuraterade `dist`-versionen på den egna spelportalen. GitHub Pages är endast ett valfritt förhandsvisningsläge. Den lokala `shots`-mappen är cirka 5,2 GB och ska inte följa med spelarbygget eller vanlig Git-historik.
- Portalen bör använda en stabil HTTPS-adress, exempelvis `/spel/simbuild/`. Vite konfigureras för sökvägen; versionsmärkta resurser cachelagras, `index.html` uppdateras direkt och föregående bygge kan återställas. Domän, protokoll och port (origin) måste hållas stabila eftersom IndexedDB-sparningar hör till origin; själva undersökvägen kan ändras utan att flytta lagringen.
- Lägg till **Rapportera fel** i spelet. Knappen visar först vilken diagnostik som delas och låter spelaren kopiera den. Därefter kan den öppna ett strukturerat GitHub Issue Form eller skicka till ett skyddat API som ägs av spelportalen.
- Diagnostiken bör omfatta byggversion, seed/karta, speldatum/hastighet, webbläsar-/GPU-förmågor, modulstatus, senaste fel och en kort prestandasammanfattning. Sparfil bifogas endast efter ett uttryckligt val.
- Lägg aldrig en GitHub-token i klienten. Helt anonym rapportering med ett klick kräver senare en skyddad backend eller GitHub App med missbruksskydd.

## R11 uppföljning — 2026-09-11

19. **Elimport kunde försvinna innan alla hus hade el** (`PT-2026-09-11-20`, critical progression regression)
   - Orsak: en lokal anläggning stängde av hela importtypen även när dess verkliga vägnätskomponent inte täckte alla byggnader.
   - Status: **försörjningsfelet reparerat och kontraktsverifierat**. Importen ligger kvar som reserv tills en lokal anläggning faktiskt når samtliga nuvarande byggnader; el, vatten/avlopp och avfall ersätts oberoende. Determinism och exakt save/load passerar.
   - Återstår: synlig varningssymbol ovanför drabbade hus och en tydlig förklaring att det nuvarande nätkontraktet distribuerar försörjning genom sammanhängande vägar; något kabelverktyg finns inte.
   - Evidens: `shots/playtest-fixes-r10/ux-utilities.json`.

20. **Lyckoläget saknade tydlig utgång** (`PT-2026-09-11-21`, high usability)
   - Status: **reparerat och UI-verifierat**. Klicka på lyckosymbolen igen, tryck Escape eller välj Select / Inspect för att återgå till normalvyn. Escape öppnar fortfarande paus-/sparmenyn när ingen infovy eller verktygsvy behöver stängas först.
   - Evidens: `shots/playtest-fixes-r10/ux-utilities.json`.

21. **Småstadstrafik och nattläsbarhet** (`PT-18`, `PT-15`)
   - Småstadskontraktet ger nu 17 synliga fordon vid 22 verkliga invånare/aktivitet, samtidigt som en helt tom isolerad väg fortfarande ger exakt 0. Dead-end/U-sväng och portalregler passerar oförändrade.
   - Full natt har höjd men fortsatt nattlig exponering och miljöfyllnad. Normala spelarstarter fångades vid 18:30 och 22:00 med noll fel; terräng, strand och vägläge är läsbara. Mänskligt omtest återstår och critic-poängen är oförändrade.
   - Evidens: `shots/playtest-fixes-r10/traffic-causality.json`, `shots/playtest-fixes-r11/player-empty-18p5.png`, `shots/playtest-fixes-r11/player-empty-22.png`.

## R11 fortsättning — 2026-09-12

21. **Byggbart djup från väg saknade markering** (`PT-2026-09-11-16`)
   - Fixad och lokalt verifierad. När vägverktyget är öppet visar den befintliga, regelstyrda zonmarkeringen exakt vilka rutor som kan bebyggas; vatten och ogiltig terräng blockeras av samma Zoning-kontrakt som byggandet använder.
   - Bevis: `shots/playtest-fixes-r11/frontage-road-tool.json` och `frontage-road-tool.png`, errors=0.

22. **Roundabout-kortet skapade ingen rondell** (`PT-2026-09-11-17`)
   - Fixad och lokalt verifierad. Kortet bygger nu en terränganpassad rondell som åtta riktiga enkelriktade vägsegment med åtta anslutningspunkter. Mitten kan inte zoneras. Undo/redo, save/load och rivning+undo passerar exakt.
   - Ett första sekventiellt försök avvisades och ersattes: terrängen byggdes om efter varje båge och kunde göra en senare båge för brant trots giltig förhandsvisning. Den accepterade lösningen genomför hela vägtransaktionen atomärt och bygger om ägarna en gång.
   - Bevis: `shots/playtest-fixes-r11/roundabout-contract.json`, `roundabout-preview.png`, `roundabout-built.png`, errors=0. Ingen ny poäng har satts och uttryckliga väjningsskyltar är inte påstått verifierade.

23. **Fullscreen-knapp saknades** (`PT-2026-09-12-22`)
   - Fixad och verifierad. **Fullscreen** finns i både huvudmenyn och pausmenyn, följer webbläsarens faktiska helskärmsläge och byter text till **Exit Fullscreen**.
   - Bevis: `shots/playtest-fixes-r11/fullscreen-contract.json`, enter/exit PASS, errors=0.

24. **Floden såg ut som ett hål med himmeltextur** (`PT-2026-09-11-14`)
   - Avgränsad fix accepterad lokalt, poäng oförändrade. Floder och sjöar använder nu den befintliga havsmasken för att få mindre bred himmelspegling och tydligare djupfärg; en svag flödesstruktur finns kvar på flygavstånd. Öppet hav behåller starkare spegling.
   - Normal spelvy vid 12:00 och 22:00 samt kustvyn är inspekterade utan fel. Mänsklig omtest återstår.
   - Bevis: `docs/builds/playtest_r11_river.md`, `docs/critic/playtest_r11_river.md` och `shots/playtest-fixes-r11/river-*`.

25. **El-/vattenbrist syntes bara inne i huspanelen och nätregeln var oklar** (`PT-2026-09-11-20`)
   - Presentationen är nu fixad och lokalt verifierad. Färdiga hus med verklig brist får en el- och/eller vattenmarkör ovanför huset. El-, vatten- och avfallsmenyerna förklarar att nätet följer sammanhängande vägar, när betalad import används och att separata kablar/rör inte ingår i den nuvarande modellen.
   - Försörjningslogiken ändrades inte. Bevis: `shots/playtest-fixes-r11/utility-warning-contract.json`, `utility-warning-markers.png`, `utility-road-guide.png`, errors=0.

## Live-omtest — 2026-09-12

26. **Orimlig fordonskö i en fempersonersby** (`PT-2026-09-12-23`, critical)
   - En tät stillastående fordonsrad uppstod på en yttre väg utan rimligt mål. Detta underkänner trafikens mänskliga trovärdighet trots att det tidigare småstadskontraktet gav ett tekniskt synligt fordonsantal.
   - Separera flottmål, resmål, vägval och kapaciteten i vändningen innan någon ändring accepteras.
   - Evidens: `shots/playtest-checkpoint-2026-09-12/human-implausible-traffic-queue.png`.

27. **Numeriska Enter avslutade inte vägen** (`PT-2026-09-12-24`, high)
   - Fixad lokalt. Både huvudtangentbordets Enter och `NumpadEnter` anropar nu det aktiva verktygets gemensamma commit-kommando. Webbläsarprovet gav exakt ett commit-anrop och noll fel.

28. **Önskemål om fortsatt simulering med fast dagsljus** (`PT-2026-09-12-25`)
   - Inte implementerat. Ett framtida `Alltid dagsljus` ska endast låsa den visuella miljötiden; datum, ekonomi, byggande och trafik ska fortsätta och sparad simuleringstid får inte ändras.

29. **Närbildskvaliteten på fordon är otillräcklig** (`PT-2026-09-12-26`, high)
   - Källinspektion bekräftar att LOD0 laddas inom 90 meter. Bilden visar därför den nuvarande riktiga geometrin och materialen, inte ett laddningsfel. Särskilt vita skåp- och lastbilar saknar tillräcklig form, materialvariation, glas, lampor och märkning.
   - Evidens: `shots/playtest-checkpoint-2026-09-12/human-vehicle-closeup-quality.png`.

30. **13 invånare motsvarar inte den synliga byn** (`PT-2026-09-12-27`, critical)
   - Mänskligt omtest underkänner PT-09. Många färdiga bostäder och verksamheter finns, men befolkningen är 13 samtidigt som trafikbilden är överdriven. Inflyttning/occupancy och trafik måste kalibreras tillsammans.
   - Evidens: `shots/playtest-checkpoint-2026-09-12/human-population-pacing-13.png`.

31. **Resmål och fordonstyp följer inte markanvändningen** (`PT-2026-09-12-28`, critical)
   - Nuvarande källkod väger startvägar mot sammanlagda boende/jobb, men skiljer inte tillräckligt på bostad, handel, kontor och industri. Lastbilsandelen styrs främst av tid på dygnet och generella resmål väljs från vägnoder.
   - Inför deterministiska resesyften: pendling mellan bostäder och jobb, kund-/leveransresor till handel samt gods mellan industri, handel och externa anslutningar.

## R12 repair status — 2026-09-12

The parked row in PT-23 was traced to the Traffic showcase catalogue leaking into ordinary play, not simulated parking. It is now showcase-only. The remaining traffic contract was corrected at the same time: 22 residential occupants produce 7 passenger vehicles rather than 17 forced mixed classes; empty isolated roads remain zero; mixed land use produces deterministic commute, return-home, customer and freight purposes; heavy vehicles occur only for freight/delivery; dead-end U-turns and portal turnover still pass; save/restore is exact.

PT-27 has an accepted objective pacing repair pending human replay. Settlement below 150 residents uses a separate early rate; the fixed fixture reaches 28 residents after 0.25 game day and 97 after one day. The normal established-city rate remains unchanged. A global rate change was tested and rejected.

PT-25 is fixed locally. Settings contains persistent **Always daylight**; at actual clock 23:00 the rendered environment is noon-bright while simulation ticks continue. Ambient audio and transit lighting follow the display setting.

The requested GitHub reporting entry is implemented in the main and pause menus. **Report a bug** opens `.github/ISSUE_TEMPLATE/bug_report.yml` with the visible New Dollarton version in the title. It does not yet attach a save or diagnostics automatically.

Evidence and the unchanged-score review are in `docs/builds/playtest_r12_mvp_repair.md` and `docs/critic/playtest_r12_local.md`. Human replay is still required before PT-23/PT-27/PT-28 can be closed subjectively.
