#!/usr/bin/env python3
"""
Özkanoğlu PenCAD — görsel/ek özellik katmanı derleyicisi
--------------------------------------------------------
Girdi : v6/kaynak/ozkanoglu_pencad_60.html  (Furkan / Antigravity derlemesi — el sürülmez)
Çıktı : release/Ozkanoglu-PenCAD-6.2.html

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
OUT = ROOT / 'release' / 'Ozkanoglu-PenCAD-6.2.html'
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


# ------------------------------------------------------------ teklif: montaj, dahil/hariç, profil bölümü
# Toplam fonksiyonu: montaj yalnızca tikliyse eklenir; tiksizken toplamlar 6.0 ile birebir aynı
mt = find1(rf'const ({ID})=({ID})\(({ID})\+({ID})\+({ID})\+({ID})\),({ID})=\2\(\1\*Math\.min\(100,Math\.max\(0,({ID})\.discountPercent\)\)/100\)', 'toplam fonksiyonu')
TV = mt.group(8)
sub(E(mt.group(0)), (f'const __oI={OZ}&&{TV}.includeInstallation?Math.max(0,+{TV}.installationPrice||0):0,{mt.group(1)}={mt.group(2)}({mt.group(3)}+{mt.group(4)}+{mt.group(5)}+{mt.group(6)}+__oI),'
                     f'{mt.group(7)}={mt.group(2)}({mt.group(1)}*Math.min(100,Math.max(0,{TV}.discountPercent))/100)').replace('\\', '\\\\'), 'toplam: montaj bedeli')
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
    f'children:"Nakliye, Palet, Ambalaj & Montaj"}}),{OZ}?OZKV.montajUI({QJ},{QCOM},{QB},{QG},{QE}):null', 'panel: montaj + antet')
sub(rf'(\{{children:\[{E(QH)}\.freight,":"\]\}}\),{E(QJ)}\.jsx\("strong",\{{children:{E(QG)}\({E(QE)}\.freight\)\}}\)\]\}}\))',
    rf'\1,{OZ}?OZKV.montajLine({QJ},{QCOM},{QE},{QG},{QCOM}.language):null', 'özet: montaj satırı')
sub(rf'{E(QH)}\.termsList\.map\(', f'({OZ}?OZKV.terms({QH}.termsList,{QCOM},{QH}):{QH}.termsList).map(', 'şartlar: dahil / dahil değil')
sub(rf'({E(QJ)}\.jsxs\("div",\{{className:"print-avoid-break grid grid-cols-1 gap-5 border-t-2 border-\[#002b5c\] pt-4 md:grid-cols-\[1fr_260px\]")',
    rf'{OZ}?OZKV.specSection({QJ},{QP},{QC},{QCOM},{QE}):null,\1', 'profil sistemleri & cam özeti')

# ------------------------------------------------------------ 3D
mg = find1(rf'({ID})=({ID})\.colors\[({ID})\.color\]\?\?\2\.colors\.WHITE,({ID})=\2\.colors\[\3\.colorOutside\|\|\3\.color\]\?\?\1,({ID})=new ({ID})\((\{{color:8246268,transparent:!0,opacity:\.34,roughness:\.08,metalness:\.1,reflectivity:\.9,side:{ID}\}})\)', '3D cam malzemesi')
cat3, pos3, glassObj = mg.group(2), mg.group(3), mg.group(7)
sub(E(f'{mg.group(5)}=new {mg.group(6)}({glassObj})'),
    f'{mg.group(5)}=new {mg.group(6)}({OZ}?OZKV.glass3D({cat3}.glasses[{pos3}.glass],{glassObj}):{glassObj})',
    '3D: cam malzemesi cam türüne göre')

sub(rf'({ID})=new ({ID})\(\{{color:({ID})\(({ID})\.fill\),roughness:\4\.matte\?\.84:\4\.woodgrain\?\.58:\.36,metalness:\4\.matte\?\.02:\.0([68])\}}\)',
    rf'\1=({OZ}?OZKV.mat3D:(m=>m))(new \2({{color:\3(\4.fill),roughness:\4.matte?.84:\4.woodgrain?.58:.36,metalness:\4.matte?.02:.0\5}}),\4,{CT})',
    '3D: iç / dış profil gerçek folyo dokusu', expected=2)

ms = find1(rf'const ({ID})=new {ID};\1\.background=new {ID}\(856602\),({ID})\.current=\1', '3D sahne')
SCENE_REF = ms.group(2)
sub(rf'({ID})\.add\(({ID})\)\}}\),({ID})\.current&&\(\3\.current\.target\.set\(0,({ID})/2,0\),\3\.current\.update\(\)\)\}}',
    rf'\1.add(\2)}}),\3.current&&(\3.current.target.set(0,\4/2,0),\3.current.update()),{OZ}&&OZKV.fix3D(\1,{CT},{SCENE_REF}.current)}}',
    '3D: ortam ışığı + doku yönü + tema arka planı')

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
out = re.sub(r'<title>[^<]*</title>', '<title>Özkanoğlu PenCAD 6.2 Stüdyo</title>', out, count=1)
inject = f'<style id="ozk-theme">\n{theme_css}\n</style>\n<script>\n{ozkv}\n</script>\n'
k = out.index(MOD_OPEN)
out = out[:k] + inject + out[k:]
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(out, encoding='utf-8')
print(f'\n→ {OUT.relative_to(ROOT)}  ({len(out) / 1024 / 1024:.2f} MB)')
