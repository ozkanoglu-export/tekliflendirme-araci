#!/usr/bin/env python3
"""
Özkanoğlu PenCAD — görsel/ek özellik katmanı derleyicisi
--------------------------------------------------------
Girdi : v6/kaynak/ozkanoglu_pencad_60.html  (Furkan / Antigravity derlemesi — el sürülmez)
Çıktı : release/Vinesso-CAD-6.2.html

• Yamalar sabit metin değil DESEN ile bulunur: Antigravity yeniden derleyip
  değişken adlarını değiştirse de doğru yer bulunur.
• Her desen tam beklenen sayıda eşleşmek zorunda; eşleşmezse derleme durur.
• Her yama "window.OZKV yoksa orijinal davranış" şeklindedir.
• Hesap / fiyat / analiz / kayıt mantığı değiştirilmez.
Kullanım:  python3 v6/build.py
"""
import base64
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'v6' / 'kaynak' / 'ozkanoglu_pencad_60.html'
GOR = ROOT / 'v6' / 'gorsel'
OUT = ROOT / 'release' / 'Vinesso-CAD-6.2.html'
ID = r'[\w$]+'

html = SRC.read_text(encoding='utf-8')
MOD_OPEN = '<script type="module" crossorigin>'
i0 = html.index(MOD_OPEN) + len(MOD_OPEN)
j0 = html.index('</script>', i0)
js = html[i0:j0]


def find1(pattern, name):
    ms = list(re.finditer(pattern, js))
    if len(ms) != 1:
        sys.exit(f'DESEN BULUNAMADI ({len(ms)} kez): {name}\n  desen: {pattern[:140]}')
    return ms[0]


def sub(pattern, repl, name, expected=1):
    global js
    ms = list(re.finditer(pattern, js))
    if len(ms) != expected:
        sys.exit(f'YAMA EŞLEŞMEDİ ({len(ms)} kez, beklenen {expected}): {name}\n  desen: {pattern[:140]}')
    js = re.sub(pattern, repl, js)
    print(f'  ✓ {name}')


def lang_var_before(pos):
    """Teklif bileşeninde dil değişkeni: X=DICT[c.language]??DICT.TR"""
    best = None
    for m in re.finditer(rf'({ID})=({ID})\[({ID})\.language\]\?\?\2\.TR', js[:pos]):
        best = m
    if not best:
        sys.exit('Dil değişkeni bulunamadı')
    return best.group(3)


# ------------------------------------------------------------ çizim bileşeni
m = find1(rf'const ({ID})=je\.useId\(\)\.replace\(/:/g,""\),({ID})=({ID})==="paper",({ID})=\(({ID})\.coupledUnits\?\.length\?\?0\)>0,({ID})=\4\?{ID}\(\5,({ID})\):null,({ID})=\6\?\6\.units:\[', 'çizim bileşeni başlığı')
R, P, POS, CAT, UNITS = m.group(1), m.group(2), m.group(5), m.group(7), m.group(8)
JSX = find1(rf'({ID})\.jsxs\("defs",\{{children:\[{ID}\.jsxs\("linearGradient",\{{id:`glass-\$\{{{re.escape(R)}\}}`', 'jsx').group(1)
mp = find1(rf'fill:({ID}),stroke:({ID})\.stroke,strokeWidth:({ID})\*\.7\}}\),!({ID})\?\.panel&&({ID})\.rect\.w>80&&', 'cam dikdörtgeni')
MT, BE, O, PT, GE = mp.group(1), mp.group(2), mp.group(3), mp.group(4), mp.group(5)
CT = find1(rf'class ({ID}) extends {ID}\{{constructor\(e,t,r,o,l,c,h,m,f\)\{{super\(e,t,r,o,l,c,h,m,f\),this\.isCanvasTexture=!0', 'CanvasTexture').group(1)
print(f'  · değişkenler: R={R} P={P} pos={POS} cat={CAT} units={UNITS} jsx={JSX} O={O} CanvasTexture={CT}')

E = re.escape
OZ = 'window.OZKV'

sub(rf'(SILVER_GREY:\{{[^{{}}]*\}})\}},series:\{{ATLANTIK_750:',
    rf'\1,...({OZ}?OZKV.extraColors():{{}})}},series:{{ATLANTIK_750:',
    'REHAU kartelası + kullanıcı renkleri kataloğa eklenir')

sub(rf'children:\[{E(JSX)}\.jsxs\("defs",\{{children:\[{E(JSX)}\.jsxs\("linearGradient",\{{id:`glass-\$\{{{E(R)}\}}`',
    f'children:[{JSX}.jsxs("defs",{{children:[...({OZ}?OZKV.defs({JSX},{R},{P},{CAT},{POS},{UNITS}):[]),{JSX}.jsxs("linearGradient",{{id:`glass-${{{R}}}`',
    'çizim SVG tanımları (cam / profil / doku)')

sub(rf'{E(MT)}={E(PT)}\?\.panel\?{E(BE)}\.fill:{E(PT)}\?\.frosted\?`url\(#frosted-\$\{{{E(R)}\}}\)`:`url\(#glass-\$\{{{E(R)}\}}\)`',
    f'{MT}={PT}?.panel?{BE}.fill:({OZ}&&OZKV.glassFill({PT},{R},{P}))||({PT}?.frosted?`url(#frosted-${{{R}}})`:`url(#glass-${{{R}}})`)',
    'cam dolgusu cam türüne göre')

sub(rf'fill:{E(MT)},stroke:{E(BE)}\.stroke,strokeWidth:{E(O)}\*\.7\}}\),!{E(PT)}\?\.panel&&{E(GE)}\.rect\.w>80&&',
    f'fill:{MT},stroke:{BE}.stroke,strokeWidth:{O}*.7}}),{OZ}?OZKV.paneFx({JSX},{GE}.rect,{PT},{P},{O},{R}):null,!{PT}?.panel&&!{OZ}&&{GE}.rect.w>80&&',
    'cam efektleri (yansıma, ara çıta, lamine kenarı)')

mf = find1(rf'({ID})=\(({ID}),({ID}),({ID}),({ID}),({ID}),({ID}),({ID}),({ID})=!1\)=>\{{const ({ID})=Math\.min\(\6,\4/3,\5/3\)', 'kasa halkası fonksiyonu')
FE = mf.group(1)
args = [mf.group(k) for k in range(2, 10)]
a_def = ','.join(args[:-1]) + f',{args[-1]}=!1'
a_call = ','.join(args)
sub(E(mf.group(0)),
    f'{FE}=({a_def})=>{OZ}?OZKV.ring({JSX},{R},{P},{O},{FE}0,{a_call}):{FE}0({a_call}),{FE}0=({a_def})=>{{const {mf.group(10)}=Math.min({args[4]},{args[2]}/3,{args[3]}/3)',
    'kasa / kanat gerçekçi profil')

sub(rf'({ID})\.mullions\.map\(({ID})=>(?=\2\.dir==="v"\?{E(JSX)}\.jsx\("rect",\{{x:\2\.axis-({ID})/2,y:\2\.from,width:\3,height:\2\.to-\2\.from,fill:({ID})\.fill,stroke:\4\.stroke,strokeWidth:({ID})\}})',
    rf'\1.mullions.map(\2=>{OZ}?OZKV.bar({JSX},{R},{P},\5,\2,\3,\4):',
    'ortakayıt gerçekçi profil')

sub(rf'className:`select-none \$\{{({ID})\}}`,role:"img"',
    rf'className:`select-none ${{{P}?"ozk-paper":"ozk-canvas"}} ${{\1}}`,role:"img"',
    'çizim SVG sınıfı (gündüz modu için)')


# ------------------------------------------------------------ sandviç paneller: PVC ve alüminyum, 24 / 42 mm
sub(r'(PNL04101S:\{[^{}]*\})\}', rf'\1,...({OZ}?OZKV.extraGlasses():{{}})}}', 'sandviç paneller kataloğa eklenir (PVC / alüminyum, 24 / 42 mm)')

# ------------------------------------------------------------ teklif: cam adları
for pat, name in [
    (rf'children:\[({ID})\.name," \[Ug="', 'teklif: cam adı (detaylı kart)'),
    (rf'`\$\{{({ID})\.name\}} \[Ug=\$\{{', 'teklif: cam adı (dolgu tablosu)'),
    (rf'"82 mm 4-Cam Alu Panel \(RC2\)":({ID})\.name', 'teklif: cam adı (kompakt kart)'),
]:
    mm = find1(pat, name)
    lv = lang_var_before(mm.start())
    v = mm.group(1)
    rep = mm.group(0).replace(f'{v}.name', f'({OZ}?OZKV.gName({v},{lv}.language):{v}.name)', 1)
    sub(E(mm.group(0)), rep.replace('\\', '\\\\'), name)

# ------------------------------------------------------------ teklif: kişi, adres, Vinesso
sub(r'"ABT CAD"', f'({OZ}?OZKV.userName():"Özkanoğlu")', 'ABT CAD varsayılanı → giriş yapan kişi', expected=3)
sub(rf'({ID})\.drawnBy\|\|"Özkanoğlu CAD"', rf'({OZ}?OZKV.fixDrawn(\1.drawnBy):(\1.drawnBy||"Özkanoğlu CAD"))', 'proje formu: çizen kişi', expected=2)
sub(rf'({ID})\.trim\(\)\|\|"Özkanoğlu CAD"', rf'\1.trim()||({OZ}?OZKV.userName():"Özkanoğlu CAD")', 'yeni proje: çizen kişi')
sub(r'address:"Yapraklı Bulvarı Şht\. A\.Kadir Acar Sok\. No: 8 / ÇANKIRI — TÜRKİYE"',
    'address:"Fatih Mah. Şht. A.Kadir Acar Sok. No: 8/A Merkez / ÇANKIRI — TÜRKİYE"', 'firma adresi güncellendi')
sub(rf'children:\[({ID})\.drawnBy,": "\]\}}\),({ID})\.jsx\("strong",\{{children:({ID})\.drawnBy\}}\)',
    rf'children:[\1.drawnBy,": "]}}),\2.jsx("strong",{{children:{OZ}?OZKV.drawnByLabel(\3.drawnBy):\3.drawnBy}})',
    'teklif: çizen / teklif veren (ad soyad · telefon)')
mv = find1(rf'children:(\[({ID})\.jsx\("img",\{{src:({ID})\.VINESSO,alt:"VINESSO",className:"h-\[17px\] w-auto object-contain"\}}\),\2\.jsx\("span",\{{className:"h-3\.5 w-px bg-slate-300"\}}\),\2\.jsx\("span",\{{className:"[^"]*",children:{ID}\.language==="TR"\?"Yurt Dışı İhracat Markamız":"International Export Brand"\}}\)\])', 'Vinesso rozeti')
sub(E(mv.group(0)), f'children:{OZ}?[OZKV.vinessoLockup({mv.group(2)},{mv.group(3)}.VINESSO,{mv.group(3)}.OZKANOGLU_MARK)]:{mv.group(1)}'.replace('\\','\\\\'),
    'teklif: Vinesso imzası "by ÖZKANOĞLU" ("ihracat markamız" kaldırıldı)')


# ------------------------------------------------------------ program adı: VİNESSO CAD (yalnız görünen yazılar; dosya biçimi/kimlikler aynı)
sub(r'children:"ÖZKANOĞLU"\}\),(\w+)\.jsx\("span",\{className:"([^"]*)",children:"PenCAD 6\.0"\}\)',
    r'children:"VİNESSO"}),\1.jsx("span",{className:"\2",children:"CAD 6.2"})', 'ad: üst başlık VİNESSO CAD 6.2')
sub(r'"Klavye Kısayolları — PenCAD 6\.0"', '"Klavye Kısayolları — Vinesso CAD 6.2"', 'ad: kısayollar başlığı')
sub(r'geçerli bir Özkanoğlu PenCAD \(', 'geçerli bir Vinesso CAD (', 'ad: proje dosyası uyarısı')
sub(r'— PenCAD 6\.0 İhracat Projesi', '— Vinesso CAD İhracat Projesi', 'ad: örnek proje adı')

# ------------------------------------------------------------ teklif: montaj, dahil/hariç, profil bölümü
# Toplam fonksiyonu: montaj yalnızca tikliyse eklenir; tiksizken toplamlar 6.0 ile birebir aynı
mt = find1(rf'const ({ID})=({ID})\(({ID})\+({ID})\+({ID})\+({ID})\),({ID})=\2\(\1\*Math\.min\(100,Math\.max\(0,({ID})\.discountPercent\)\)/100\)', 'toplam fonksiyonu')
TV = mt.group(8)
sub(E(mt.group(0)), (f'const __oI={OZ}&&{TV}.includeInstallation?Math.max(0,+{TV}.installationPrice||0):0,{mt.group(1)}={mt.group(2)}({mt.group(3)}+{mt.group(4)}+{mt.group(5)}+{mt.group(6)}+__oI),'
                     f'{mt.group(7)}={mt.group(2)}(({OZ}?{mt.group(3)}:{mt.group(1)})*Math.min(100,Math.max(0,{TV}.discountPercent))/100)').replace('\\', '\\\\'),
    'toplam: montaj bedeli + iskonto yalnız ürün tutarına (ambalaj/palet/nakliye/montaj iskontosuz)')
# Hedef fiyattan iskonto oranı: oran artık ürün tutarı üzerinden hesaplanır
sub(rf'(function {ID}\(({ID}),({ID}),({ID})\)\{{const ({ID})=\2/\(1\+Math\.max\(0,\4\.vatPercent\)/100\);if\(\3\.subtotal<=0\)return 0;const ({ID})=\(\3\.subtotal-\5\)/)\3\.subtotal\*100;',
    rf'\1({OZ}?\3.products:\3.subtotal)*100;', 'hedef fiyat: iskonto oranı ürün tutarına göre')
sub(rf'(packaging:{ID},pallet:{ID},freight:{ID},)(subtotal:)', r'\1installation:__oI,\2', 'toplam: montaj alanı')
sub(rf'(grossProfit:{ID}-{ID}-{ID}-{ID}-{ID}-{ID})\}}', r'\1-__oI}', 'toplam: brüt kâr montaj düşümü')

# Teklif bileşeni değişkenleri
mq = find1(rf'\(\{{project:({ID}),totals:({ID}),catalog:({ID}),settings:({ID}),onUpdateProject:({ID}),notify:({ID})\}}\)=>\{{const ({ID})=\1\.commercial,({ID})=({ID})\[\7\.language\]\?\?\9\.TR', 'teklif bileşeni')
QP, QE, QC, QCOM, QH = mq.group(1), mq.group(2), mq.group(3), mq.group(7), mq.group(8)
mf2 = find1(rf'({ID})\.jsx\("input",\{{type:"checkbox",checked:{E(QCOM)}\.includeFreight,onChange:\(?({ID})\)?=>({ID})\(\{{includeFreight:', 'nakliye kutusu')
QJ, QB = mf2.group(1), mf2.group(3)
QG = find1(rf'children:({ID})\({E(QE)}\.freight\)\}}\)\]\}}\),{E(QCOM)}\.includeFreight&&', 'para biçimi').group(1)
print(f'  teklif: project={QP} totals={QE} catalog={QC} comm={QCOM} dict={QH} jsx={QJ} upd={QB} fmt={QG}')

sub(r'children:"Nakliye, Palet & Ambalaj Seçenekleri"\}\)',
    f'children:"Nakliye, Palet, Ambalaj & Montaj"}}),{OZ}?OZKV.montajUI({QJ},{QCOM},{QB},{QG},{QE},{{project:{QP},catalog:{QC},settings:{mq.group(4)}}}):null', 'panel: montaj + antet')
sub(rf'(\{{children:\[{E(QH)}\.freight,":"\]\}}\),{E(QJ)}\.jsx\("strong",\{{children:{E(QG)}\({E(QE)}\.freight\)\}}\)\]\}}\))',
    rf'\1,{OZ}?OZKV.montajLine({QJ},{QCOM},{QE},{QG},{QCOM}.language):null', 'özet: montaj satırı')
sub(rf'{E(QH)}\.termsList\.map\(', f'({OZ}?OZKV.terms({QH}.termsList,{QCOM},{QH}):{QH}.termsList).map(', 'şartlar: dahil / dahil değil')
sub(rf'({E(QJ)}\.jsxs\("div",\{{className:"print-avoid-break grid grid-cols-1 gap-5 border-t-2 border-\[#002b5c\] pt-4 md:grid-cols-\[1fr_260px\]")',
    rf'{OZ}?OZKV.specSection({QJ},{QP},{QC},{QCOM},{QE}):null,\1', 'profil sistemleri & cam özeti')


# ------------------------------------------------------------ projeler: verilen teklifler
mp2 = find1(rf'\(\{{project:({ID}),savedProjects:({ID}),catalog:({ID}),settings:({ID}),grandTotal:({ID}),onLoadProject:({ID}),onImportBundle:{ID},onSaveProject:({ID}),onDeleteSaved:{ID},onStartNewProject:{ID},onEditProjectSetup:{ID},notify:({ID})\}}\)=>\{{const\[{ID},{ID}\]=({ID})\.useState\(""\)', 'projeler bileşeni')
PJ_LOAD, PJ_SAVE, PJ_NOTIFY, PJ_REACT, PJ_PROJ, PJ_CAT = mp2.group(6), mp2.group(7), mp2.group(8), mp2.group(9), mp2.group(1), mp2.group(3)
sub(rf'({ID})\.jsxs\("div",\{{className:"rounded-2xl border border-ink-800 bg-ink-900/60 p-4 space-y-3",children:\[\1\.jsxs\("div",\{{className:"flex items-center justify-between border-b border-ink-800 pb-2",children:\[\1\.jsxs\("span",\{{className:"flex items-center gap-2 font-bold text-brand-300",children:\[\1\.jsx\({ID},\{{size:15\}}\)," Tarayıcı Arşivi \("',
    lambda m: f'{OZ}?OZKV.issuedPanel({m.group(1)},{PJ_REACT},{{load:{PJ_LOAD},notify:{PJ_NOTIFY},save:{PJ_SAVE},project:{PJ_PROJ},catalog:{PJ_CAT}}}):null,' + m.group(0), 'projeler: verilen teklifler paneli')


# ------------------------------------------------------------ favoriler
RX = PJ_REACT
sub(rf'return\{{popular:({ID}),standard:({ID}),other:({ID})\}}\}}', rf'return {OZ}?OZKV.favColors({{popular:\1,standard:\2,other:\3}}):{{popular:\1,standard:\2,other:\3}}}}', 'renk grupları: favoriler en üstte')
sub(rf'const\{{popular:({ID}),standard:({ID})\}}=({ID})\(({ID})\),', rf'const __ozf={OZ}?OZKV.useFav({RX}):0,{{popular:\1,standard:\2}}=\3(\4),', 'hızlı renkler: favori güncellemesi')
sub(rf'(className:"truncate text-\[10px\] font-semibold leading-tight",children:({ID})\}}\))\]\}},({ID})\.key\)',
    rf'\1,{OZ}?OZKV.starMini(n,"colors",\3.key):null]}},\3.key)', 'hızlı renkler: minik yıldız')
FAV_TARGETS = [
    (rf'({ID})\.(jsxs?)\("select",\{{value:({ID})\.colorOutside\|\|\3\.color,', 'colors', 'renk seçimi (dış)', 1),
    (rf'({ID})\.(jsxs?)\("select",\{{value:({ID})\.(?:color|colorOutside),', 'colors', 'renk seçimleri', 3),
    (rf'({ID})\.(jsxs?)\("select",\{{value:({ID})\.(?:shutter\.(?:slatColor|guideColor|boxColor)|flyscreen\.color),', 'colors', 'panjur / sineklik renkleri', 4),
    (rf'({ID})\.(jsxs?)\("select",\{{value:({ID})\.glass,', 'glasses', 'cam seçimleri', 2),
    (rf'({ID})\.(jsxs?)\("select",\{{value:({ID})\.series,', 'series', 'profil serisi seçimleri', 2),
    (rf'({ID})\.(jsxs?)\("select",\{{value:({ID})\.hardware\|\|"",', 'hardware', 'donanım seçimi', 1),
]
for pat, kind, name, cnt in FAV_TARGETS:
    sub(pat, lambda m, kind=kind: f'({OZ}?OZKV.ws:(R,j,k,t,p,y)=>j.{m.group(2)}(t,p,y))({RX},{m.group(1)},"{kind}","select",' + m.group(0).split('("select",', 1)[1],
        f'favori: {name}', expected=cnt)


# ------------------------------------------------------------ alüminyum eşik: pencerelere de (sürme hariç), açıkça seçilince
# Eski projelerde pencerede kalmış "alu20" değerleri etkilenmesin diye ayrı işaret: ozkWinThr (yalnızca kullanıcı seçince yazılır)
sub(rf'({ID})=({ID})\.kind==="casement"&&({ID})\.threshold==="alu20"&&({ID})\(\3\.root\)',
    rf'\1=\2.kind==="casement"&&\3.threshold==="alu20"&&(\4(\3.root)||!!({OZ}&&\3.ozkWinThr))', 'eşik: pencerelerde de uygulanır (işaretliyse)')
sub(r'threshold:([\w$]+)\.threshold==="alu20"\?"alu20":"pvc",',
    rf'threshold:\1.threshold==="alu20"?"alu20":"pvc",...(\1.ozkWinThr?{{ozkWinThr:!0}}:{{}}),', 'eşik: pencere işareti kayıtta korunur')
mpt = find1(rf'({ID})=({ID})&&({ID})\.threshold==="alu20"&&({ID})\(\3\.root\),({ID})=({ID})\.techSpecs,({ID})=({ID})=>\{{', 'eşik paneli değişkenleri')
KE, VL, VT = mpt.group(3), mpt.group(4), mpt.group(7)
sub(E(mpt.group(0)), (f'{mpt.group(1)}={mpt.group(2)}&&{KE}.threshold==="alu20"&&({VL}({KE}.root)||!!({OZ}&&{KE}.ozkWinThr)),{mpt.group(5)}={mpt.group(6)}.techSpecs,{VT}={mpt.group(8)}=>{{').replace('\\', '\\\\'), 'eşik: alt yükseltme seçeneği pencerelerde de')
sub(rf'value:{E(KE)}\.threshold,onChange:({ID})=>\{{const ({ID})=\1\.target\.value;({ID})\(\{{threshold:\2\}}\)',
    lambda m: (f'value:{OZ}&&{KE}.threshold==="alu20"&&!{VL}({KE}.root)&&!{KE}.ozkWinThr?"pvc":{KE}.threshold,onChange:{m.group(1)}=>{{const {m.group(2)}={m.group(1)}.target.value;'
               f'{m.group(3)}({{threshold:{m.group(2)}}}),{OZ}&&!{VL}({KE}.root)&&{VT}({{ozkWinThr:{m.group(2)}==="alu20"}})'), 'eşik: seçim pencerelere de işler')
sub(r'"Kapı Eşik Tipi "', '"Eşik Tipi (kapı + pencere) "', 'eşik: etiket')


# ------------------------------------------------------------ toplu profil değişimi: serinin temel camı fonksiyonu dışarı açılır
mbg = find1(rf'function ({ID})\(({ID}),({ID})\)\{{const ({ID})=\3\?\?({ID});if\(!\2\|\|\2\.isAluPanelDoor\)return"DC4164SN";', 'serinin temel camı')
sub(E(mbg.group(0)), (f'window.OZKV&&(OZKV.basicGlass=function(s,c){{return {mbg.group(1)}(s,c)}});' + mbg.group(0)).replace('\\', '\\\\'), 'temel cam fonksiyonu katmana açıldı')


# ------------------------------------------------------------ ana bileşen bağlantısı (sekme değiştirmeden proje okuma / yükleme)
mapp = find1(rf'project:({ID}),savedProjects:{ID},catalog:({ID}),settings:({ID}),grandTotal:{ID}\.grand,onLoadProject:({ID})=>\{{({ID})\(({ID})\(\4,\2\)\),({ID})\(0\),({ID})\("studio"\)\}},onImportBundle:{ID},onSaveProject:({ID})', 'ana bileşen proje bağlantısı')
A_P, A_C, A_S, A_SET, A_XA, A_SEL, A_SAVE = mapp.group(1), mapp.group(2), mapp.group(3), mapp.group(5), mapp.group(6), mapp.group(7), mapp.group(9)
sub(rf'const ({ID})=\(\)=>\{{const\[({ID}),({ID})\]=({ID})\.useState\("studio"\)',
    lambda m: (f'const {m.group(1)}=()=>{{{OZ}&&OZKV.bindApp&&OZKV.bindApp({{getProject:()=>{A_P},getCatalog:()=>{A_C},getSettings:()=>{A_S},'
               f'load:__z=>{{{A_SET}({A_XA}(__z,{A_C})),{A_SEL}(0)}},save:__z=>{A_SAVE}(__z)}});'
               f'const[{m.group(2)},{m.group(3)}]={m.group(4)}.useState("studio")'), 'ana bileşen bağlandı')

# ------------------------------------------------------------ 3D

# ------------------------------------------------------------ 3D: gerçekçi kol, katmanlı cam, HOK levye, vasistas
mj = find1(rf'function ({ID})\(({ID})\)\{{const\{{kind:({ID}),sideSign:({ID}),hx:({ID}),hy:({ID}),sw:{ID},sh:{ID},sf:{ID},sashDepth:({ID}),handleOnRight:({ID}),isDoor:({ID}),isActive:{ID},isHS:({ID}),barLenM:{ID},hwMat:({ID})\}}=\2,({ID})=new ({ID});if\(\3==="none"\)return\{{group:\12\}};const ({ID})=\4\*\(\7\*\.48\);', '3D kol fonksiyonu')
J_T, J_r, J_o, J_k, J_t, J_y, J_x, J_f, J_b, J_G = mj.group(12), mj.group(5), mj.group(6), mj.group(14), mj.group(4), mj.group(9), mj.group(10), mj.group(8), mj.group(11), mj.group(13)
mcy = re.search(rf'new ({ID})\(new ({ID})\(\.014,\.014,{ID},16\),{ID}\)', js)
msp = re.search(rf'new {ID}\(new ({ID})\(\.028,18,14\),{ID}\)', js)
mbx = re.search(rf'new {ID}\(new ({ID})\(\.018,\.02,\.034\),{ID}\)', js)
if not (mcy and msp and mbx):
    sys.exit('3D yapıcılar bulunamadı')
C3 = f'{{G:{J_G},M:{mcy.group(1)},B:{mbx.group(1)},C:{mcy.group(2)},S:{msp.group(1)}}}'
print('  3D yapıcılar:', C3)
sub(rf'const ({ID})={E(J_y)}&&!{E(J_x)},({ID})=\1\?\.165:{E(J_x)}\?\.145:\.075,',
    lambda m: f'if({OZ}&&OZKV.lever3D){{const __h=OZKV.lever3D({C3},{J_T},{{r:{J_r},y:{J_o},k:{J_k},t:{J_t},door:{J_y}&&!{J_x},hs:{J_x},right:{J_f},mat:{J_b}}});if(__h)return __h}}' + m.group(0), '3D: gerçekçi kollar')

mk = find1(rf'({ID})\.position\.set\(({ID}),({ID}),({ID})\),({ID})\.add\(({ID})\(({ID}),({ID}),({ID}),({ID}),({ID}),({ID}),!1\)\);const ({ID})=({ID})\.panes\.find', '3D kanat grubu')
KE, IE, ST, GT, AT = mk.group(5), mk.group(7), mk.group(8), mk.group(9), mk.group(10)
mhw = re.search(rf'barLenM:{ID},hwMat:({ID})\}}\)', js[mk.end():])
UT = mhw.group(1)
sub(rf'const ({ID})=\{{pivot:({ID}),opening:({ID})\.opening,',
    lambda m: f'const {m.group(1)}={{__ozk:{{sash:{m.group(3)},inner:{KE},w:{IE},h:{ST},face:{GT},depth:{AT},hw:{UT},C:{C3}}},pivot:{m.group(2)},opening:{m.group(3)}.opening,', '3D: kanat bilgisi (levye için)')
sub(rf'const ({ID})=\(({ID}),({ID})\)=>\{{if\(\2\.opening==="slide"\|\|\2\.opening==="liftslide"\)',
    lambda m: f'const {m.group(1)}=({m.group(2)},{m.group(3)})=>{OZ}&&OZKV.anim3D?OZKV.anim3D({m.group(2)},{m.group(3)},__ozL0):__ozL0({m.group(2)},{m.group(3)}),__ozL0=({m.group(2)},{m.group(3)})=>{{if({m.group(2)}.opening==="slide"||{m.group(2)}.opening==="liftslide")', '3D: kol / HOK levye / vasistas animasyonu')
mgl = find1(rf'({ID})=({ID})\?\.panelModel\?({ID})\(\2\.panelModel\):({ID})\?\.panel\?({ID}):({ID}),({ID})=new ({ID})\(new ({ID})\(({ID}),({ID}),({ID})\),\1\);if\(\7\.position\.set', '3D kanat camı')
sub(rf'({E(mgl.group(7))})\.receiveShadow=!!({E(mgl.group(2))})\?\.panelModel,({ID})\.add\(\1\),',
    rf'\1.receiveShadow=!!\2?.panelModel,\3.add(\1),{OZ}&&OZKV.glassLayers(\1,{mgl.group(4)},\2),', '3D: kanat camı katmanları')
sub(rf'const ({ID})=new ({ID})\(new ({ID})\(({ID}),({ID}),({ID})\),({ID})\);if\(\1\.position\.set\(([^;]*?)\),({ID})\.add\(\1\),({ID})\.muntin\?\.enabled&&!({ID})\?\.panel&&!({ID})\.panelModel',
    lambda m: m.group(0).replace(f'{m.group(9)}.add({m.group(1)}),', f'{m.group(9)}.add({m.group(1)}),{OZ}&&OZKV.glassLayers({m.group(1)},{m.group(11)},{m.group(12)}),', 1), '3D: sabit cam katmanları')
mg = find1(rf'({ID})=({ID})\.colors\[({ID})\.color\]\?\?\2\.colors\.WHITE,({ID})=\2\.colors\[\3\.colorOutside\|\|\3\.color\]\?\?\1,({ID})=new ({ID})\((\{{color:8246268,transparent:!0,opacity:\.34,roughness:\.08,metalness:\.1,reflectivity:\.9,side:{ID}\}})\)', '3D cam malzemesi')
cat3, pos3, glassObj = mg.group(2), mg.group(3), mg.group(7)
sub(E(f'{mg.group(5)}=new {mg.group(6)}({glassObj})'),
    f'{mg.group(5)}=new {mg.group(6)}({OZ}?OZKV.glass3D({cat3}.glasses[{pos3}.glass],{glassObj}):{glassObj})',
    '3D: cam malzemesi cam türüne göre')

sub(rf'({ID})=new ({ID})\(\{{color:({ID})\(({ID})\.fill\),roughness:\4\.matte\?\.84:\4\.woodgrain\?\.58:\.36,metalness:\4\.matte\?\.02:\.0([68])\}}\)',
    rf'\1=({OZ}?OZKV.mat3D:(m=>m))(new \2({{color:\3(\4.fill),roughness:\4.matte?.84:\4.woodgrain?.58:.36,metalness:\4.matte?.02:.0\5}}),\4,{CT})',
    '3D: iç / dış profil gerçek folyo dokusu', expected=2)

ms = find1(rf'const ({ID})=new {ID};\1\.background=new {ID}\(856602\),({ID})\.current=\1', '3D sahne')
POS3D = find1(rf'=\(\{{pos:({ID}),catalog:{ID},sashOpenPercent:', '3D bileşeni').group(1)
SCENE_REF = ms.group(2)
sub(rf'({ID})\.add\(({ID})\)\}}\),({ID})\.current&&\(\3\.current\.target\.set\(0,({ID})/2,0\),\3\.current\.update\(\)\)\}}',
    rf'\1.add(\2)}}),\3.current&&(\3.current.target.set(0,\4/2,0),\3.current.update()),{OZ}&&OZKV.fix3D(\1,{CT},{SCENE_REF}.current,{POS3D})}}',
    '3D: ortam ışığı + doku yönü + tema arka planı')


# ------------------------------------------------------------ aksesuar: menteşe kapakları + tahliye kapakları (aksesuar rengi)
OUTV = find1(rf'outsideView:({ID})=!1', 'dış görünüm değişkeni').group(1)
msf = find1(rf'({ID})\(({ID}),({ID}),({ID}),({ID}),({ID})\.face,({ID})\.fill,({ID})\.stroke,!1\)', '2D kanat çerçevesi')
hw_all = [m for m in re.finditer(rf'({ID})=({ID})\(({ID})\(({ID})\.techSpecs,\4\.color\)\),', js[:msf.start()])]
if not hw_all:
    sys.exit('2D aksesuar rengi bulunamadı')
HW2D = hw_all[-1].group(1)
sub(E(msf.group(0)), (msf.group(0) + f',{OZ}?OZKV.sashHw({JSX},{msf.group(6)},{HW2D},{OUTV},{O},{P}):null').replace('\\', '\\\\'), '2D: menteşe kapakları (aksesuar rengi)')
sub(rf':({ID})\(0,0,({ID})\.W,\2\.H,({ID}),({ID})\.fill,\4\.stroke,\2\.threshold\)',
    lambda m: f':({OZ}?OZKV.frameHw({JSX},{m.group(1)}(0,0,{m.group(2)}.W,{m.group(2)}.H,{m.group(3)},{m.group(4)}.fill,{m.group(4)}.stroke,{m.group(2)}.threshold),{m.group(2)},{HW2D},{OUTV},{O},{P},{m.group(3)},{m.group(4)}.fill):{m.group(1)}(0,0,{m.group(2)}.W,{m.group(2)}.H,{m.group(3)},{m.group(4)}.fill,{m.group(4)}.stroke,{m.group(2)}.threshold))',
    '2D: tahliye delik kapakları (aksesuar rengi)')
mpe = find1(rf'const ({ID})=new ({ID});\1\.position\.set\(({ID}),({ID}),0\);const ({ID})=({ID})\(({ID})\.W,\7\.H,\7\.shape\)', '3D birim grubu')
pre = js[:mpe.start()]
mBD = [m for m in re.finditer(rf'({ID})=({ID})\.H\*({ID}),({ID})=\2\.W\*\3', pre)][-1]
mZf = [m for m in re.finditer(rf'({ID})=\(({ID})\.faces\.frame\|\|58\)\*({ID})', pre)][-1]
mNe = [m for m in re.finditer(rf'({ID})=\(({ID})\.thickness\|\|70\)\*({ID})', pre)][-1]
mUt = [m for m in re.finditer(rf'({ID})=({ID})\(({ID})\(({ID})\.techSpecs,\4\.color\)\),({ID})=new ({ID})\(\{{color:\1', pre)][-1]
mXo = [m for m in re.finditer(rf'({ID})=({ID})\.colors\[({ID})\.colorOutside\|\|\3\.color\]\?\?({ID}),', pre)][-1]
sub(E(mpe.group(0)), (f'const {mpe.group(1)}=new {mpe.group(2)};{mpe.group(1)}.position.set({mpe.group(3)},{mpe.group(4)},0);'
                      f'{mpe.group(1)}.userData.ozkF={{w:{mBD.group(4)},h:{mBD.group(1)},face:{mZf.group(1)},depth:{mNe.group(1)},thr:!!{mpe.group(7)}.threshold,hw:{mUt.group(5)},col:{mXo.group(1)}.fill,wood:!!{mXo.group(1)}.woodgrain,M:{C3}}};'
                      f'const {mpe.group(5)}={mpe.group(6)}({mpe.group(7)}.W,{mpe.group(7)}.H,{mpe.group(7)}.shape)').replace('\\', '\\\\'), '3D: birim bilgisi (tahliye kapakları için)')

# ------------------------------------------------------------ varyant fiyatları: toplam hesap ve para biçimi katmana açılır
mn1 = find1(rf'function ({ID})\(({ID}),({ID}),({ID}),({ID}),({ID})\)\{{const ({ID})=\2\.map\(\(?({ID})\)?=>({ID})\(\8,\3,\4,\5,\6\)\);', 'toplam hesap fonksiyonu')
sub(E(mn1.group(0)), (f'window.OZKV&&(OZKV.calcTotals=function(a,b,c,d,f){{return {mn1.group(1)}(a,b,c,d,f)}});' + mn1.group(0)).replace('\\', '\\\\'), 'toplam hesap katmana açıldı')
mfs = find1(rf'function ({ID})\(({ID}),({ID}),({ID}),({ID})=2\)\{{const ({ID})=\4\.exchangeRates\[\3\]\?\?1', 'para biçimi fonksiyonu')
sub(E(mfs.group(0)), (f'window.OZKV&&(OZKV.fmt=function(a,b,c){{return {mfs.group(1)}(a,b,c)}});' + mfs.group(0)).replace('\\', '\\\\'), 'para biçimi katmana açıldı')

# ------------------------------------------------------------ tema CSS
CANVAS_TO_PAPER = {
    '#94a3b8': '#475569', '#38bdf8': '#0284c7', '#7dd3fc': '#0369a1', '#334155': '#94a3b8', '#fbbf24': '#b45309',
    '#0a0d12': '#ffffff', '#f87171': '#b91c1c', '#60a5fa': '#0055a5', '#e2e8f0': '#0f172a', '#1e293b': '#f1f5f9',
    '#475569': '#94a3b8', '#cbd5e1': '#334155', '#c7d2fe': '#312e81', '#fcd34d': '#b45309', '#93c5fd': '#002b5c',
    '#fde68a': '#92400e', '#0c4a6e': '#e0f2fe', '#064e3b': '#f0fdf4', '#6ee7b7': '#047857', '#fca5a5': '#991b1b',
    '#78350f': '#fef3c7', '#14532d': '#dcfce7', '#4ade80': '#16a34a', '#312e81': '#e0e7ff', '#818cf8': '#4f46e5',
    '#f59e0b': '#b45309',
}
rules = []
for c, p in CANVAS_TO_PAPER.items():
    rules.append(f"html[data-ozk-theme='day'] svg.ozk-canvas [fill='{c}']{{fill:{p}}}")
    rules.append(f"html[data-ozk-theme='day'] svg.ozk-canvas [stroke='{c}']{{stroke:{p}}}")
rules.append("html[data-ozk-theme='day'] svg.ozk-canvas [stroke='#f8fafc']{stroke:#0f172a}")
rules.append("html[data-ozk-theme='day'] svg.ozk-canvas text[fill='#f8fafc']{fill:#0f172a}")
rules.append("html[data-ozk-theme='day'] svg.ozk-canvas rect[fill='#0f172a']{fill:#ffffff}")
theme_css = (GOR / 'ozk-theme.css').read_text(encoding='utf-8').replace('__OZK_CANVAS_DAY__', '\n'.join(rules))


# Yazdırma: Chrome sayfa genişliğini (A4 ≈ 720 px) ekran kırılımlarının altında sayınca teklif kartları alt alta dizilip
# uzuyor ve "bölünmesin" kuralıyla bir sonraki sayfaya atlıyordu (ilk sayfa boş kalıyordu). Ekrandaki md/lg düzeni
# yazdırmada da aynen uygulanır (yalnız yerleşim; hiçbir yazı / sayı değişmez).
def _media_block(src, bp):
    m = re.search(r'@media\s*\(min-width:\s*' + bp + r'px\)\{', src)
    if not m:
        sys.exit(f'Kırılım bulunamadı: {bp}px')
    i, depth = m.end(), 1
    while depth:
        c = src[i]
        depth += c == '{'
        depth -= c == '}'
        i += 1
    return src[m.end():i - 1]


_pr = []
for _bp in ('640', '768', '1024'):
    for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', _media_block(html, _bp)):
        _pr.append(','.join('html body ' + x.strip() for x in sel.split(',')) + '{' + body + '}')
theme_css += '\n@media print{' + ''.join(_pr) + '}\n'
print(f'  ✓ yazdırma: ekran düzeni sabitlendi ({len(_pr)} kural)')

# ------------------------------------------------------------ dokular + kartela
rehau = json.loads((GOR / 'rehau_kartela.json').read_text(encoding='utf-8'))


def data_url(p, mime):
    return f'data:{mime};base64,' + base64.b64encode(p.read_bytes()).decode()


tex = {}
for p in sorted((GOR / 'dokular').glob('p*.jpg')):
    tex[p.stem] = data_url(p, 'image/jpeg')
assets = {}
for p in sorted((GOR / 'varliklar').glob('*')) if (GOR / 'varliklar').exists() else []:
    mime = {'png': 'image/png', 'jpg': 'image/jpeg', 'svg': 'image/svg+xml', 'webp': 'image/webp'}.get(p.suffix[1:])
    if mime:
        assets[p.stem] = data_url(p, mime)

ozkv = (GOR / 'ozk-visual.js').read_text(encoding='utf-8')
ozkv = ozkv.replace('__OZK_TEX__', json.dumps(tex)).replace('__OZK_REHAU__', json.dumps(rehau, ensure_ascii=False)).replace('__OZK_ASSETS__', json.dumps(assets))

# ------------------------------------------------------------ birleştir
out = html[:i0] + js + html[j0:]
out = re.sub(r'<title>[^<]*</title>', '<title>Vinesso CAD 6.2</title>', out, count=1)
viewer_js = (GOR / 'vendor' / 'ozk3.min.js').read_text(encoding='utf-8')
if '</script' in viewer_js.lower() or '<!--' in viewer_js:
    sys.exit('görüntüleyici paketinde </script var')
if '<!--' in ozkv or '</script' in ozkv.lower():
    sys.exit('ozk-visual.js içinde <!-- veya </script var')
ai_js = (GOR / 'vendor' / 'ozkai.min.js').read_text(encoding='utf-8')
if '</script' in ai_js.lower() or '<!--' in ai_js:
    sys.exit('AI paketinde </script veya <!-- var')
inject = f'<style id="ozk-theme">\n{theme_css}\n</style>\n<script type="text/plain" id="ozk3-src">{viewer_js}</script>\n<script type="text/plain" id="ozkai-src">{ai_js}</script>\n<script>\n{ozkv}\n</script>\n'
k = out.index(MOD_OPEN)
out = out[:k] + inject + out[k:]
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(out, encoding='utf-8')
print(f'\n→ {OUT.relative_to(ROOT)}  ({len(out) / 1024 / 1024:.2f} MB)')
