#!/usr/bin/env python3
"""
Özkanoğlu PenCAD 6.0 → 6.1 görsel katman derleyicisi
---------------------------------------------------
Furkan'ın 6.0 derlemesine (v6/kaynak/ozkanoglu_pencad_60.html) DOKUNMADAN,
yalnızca görsel katmanı (v6/gorsel/*) bağlayan kopya üretir:
    release/Ozkanoglu-PenCAD-6.1.html

Kurallar:
  • Hesap, fiyat, analiz, kayıt (localStorage) kodu değiştirilmez.
  • Her yama orijinal metinde TAM OLARAK BİR KEZ eşleşmek zorundadır;
    eşleşmezse derleme durur (yanlış yere yama yapılamaz).
  • Her yama "window.OZKV yoksa orijinal davranış" şeklinde yazılır.
Kullanım:  python3 v6/build_v61.py
"""
import base64
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'v6' / 'kaynak' / 'ozkanoglu_pencad_60.html'
GOR = ROOT / 'v6' / 'gorsel'
OUT = ROOT / 'release' / 'Ozkanoglu-PenCAD-6.1.html'

html = SRC.read_text(encoding='utf-8')
MOD_OPEN = '<script type="module" crossorigin>'
i = html.index(MOD_OPEN) + len(MOD_OPEN)
j = html.index('</script>', i)
js = html[i:j]

# ---------------------------------------------------------------- yamalar
PATCHES = [
    (
        'REHAU kartela renkleri kataloğa eklenir (mevcut renkler aynen kalır)',
        'stroke:"#475569"}},series:{ATLANTIK_750:',
        'stroke:"#475569"},...(window.OZKV?OZKV.rehauColors:{})},series:{ATLANTIK_750:',
    ),
    (
        'Çizim SVG tanımlarına cam / profil / doku tanımları eklenir',
        'children:[n.jsxs("defs",{children:[n.jsxs("linearGradient",{id:`glass-${R}`',
        'children:[n.jsxs("defs",{children:[...(window.OZKV?OZKV.defs(n,R,P,t,i,L):[]),n.jsxs("linearGradient",{id:`glass-${R}`',
    ),
    (
        'Cam dolgusu cam türüne göre seçilir',
        'Mt=Ct?.panel?be.fill:Ct?.frosted?`url(#frosted-${R})`:`url(#glass-${R})`',
        'Mt=Ct?.panel?be.fill:(window.OZKV&&OZKV.glassFill(Ct,R,P))||(Ct?.frosted?`url(#frosted-${R})`:`url(#glass-${R})`)',
    ),
    (
        'Cam efektleri (yansıma, ara çıta, lamine kenarı) eklenir',
        'fill:Mt,stroke:be.stroke,strokeWidth:O*.7}),!Ct?.panel&&ge.rect.w>80&&ge.rect.h>80&&',
        'fill:Mt,stroke:be.stroke,strokeWidth:O*.7}),window.OZKV?OZKV.paneFx(n,ge.rect,Ct,P,O,R):null,!Ct?.panel&&!window.OZKV&&ge.rect.w>80&&ge.rect.h>80&&',
    ),
    (
        'Kasa/kanat halkası gerçekçi profil katmanıyla sarılır',
        'Fe=(Ee,ke,$,z,D,me,We,be=!1)=>{const $e=Math.min(D,$/3,z/3)',
        'Fe=(Ee,ke,$,z,D,me,We,be=!1)=>window.OZKV?OZKV.ring(n,R,P,O,Fe0,Ee,ke,$,z,D,me,We,be):Fe0(Ee,ke,$,z,D,me,We,be),Fe0=(Ee,ke,$,z,D,me,We,be=!1)=>{const $e=Math.min(D,$/3,z/3)',
    ),
    (
        'Ortakayıt gerçekçi profil olarak çizilir',
        '$.mullions.map(ge=>ge.dir==="v"?n.jsx("rect",{x:ge.axis-me/2,y:ge.from,width:me,height:ge.to-ge.from,fill:be.fill,stroke:be.stroke,strokeWidth:O},ge.id):n.jsx("rect",{x:ge.from,y:ge.axis-me/2,width:ge.to-ge.from,height:me,fill:be.fill,stroke:be.stroke,strokeWidth:O},ge.id))',
        '$.mullions.map(ge=>window.OZKV?OZKV.bar(n,R,P,O,ge,me,be):ge.dir==="v"?n.jsx("rect",{x:ge.axis-me/2,y:ge.from,width:me,height:ge.to-ge.from,fill:be.fill,stroke:be.stroke,strokeWidth:O},ge.id):n.jsx("rect",{x:ge.from,y:ge.axis-me/2,width:ge.to-ge.from,height:me,fill:be.fill,stroke:be.stroke,strokeWidth:O},ge.id))',
    ),
    (
        'Çizim SVG sınıfı (tuval / kâğıt) — gündüz modu renk eşlemesi için',
        'className:`select-none ${g}`',
        'className:`select-none ${P?"ozk-paper":"ozk-canvas"} ${g}`',
    ),
    (
        'Teklif: cam adı teklif dilinde (Avrupa detaylı kart)',
        'children:[re.name," [Ug="',
        'children:[window.OZKV?OZKV.gName(re,c.language):re.name," [Ug="',
    ),
    (
        'Teklif: dolgu tablosunda cam adı teklif dilinde',
        '`${V.name} [Ug=${ft(V.ug,2)}]`',
        '`${window.OZKV?OZKV.gName(V,c.language):V.name} [Ug=${ft(V.ug,2)}]`',
    ),
    (
        'Teklif: kompakt kartta cam adı teklif dilinde',
        'j.isAluPanelDoor?"82 mm 4-Cam Alu Panel (RC2)":re.name',
        'j.isAluPanelDoor?"82 mm 4-Cam Alu Panel (RC2)":(window.OZKV?OZKV.gName(re,c.language):re.name)',
    ),
    (
        '3D: cam malzemesi cam türüne göre',
        'se=new eM({color:8246268,transparent:!0,opacity:.34,roughness:.08,metalness:.1,reflectivity:.9,side:Sr})',
        'se=new eM(window.OZKV?OZKV.glass3D(e.glasses[i.glass],{color:8246268,transparent:!0,opacity:.34,roughness:.08,metalness:.1,reflectivity:.9,side:Sr}):{color:8246268,transparent:!0,opacity:.34,roughness:.08,metalness:.1,reflectivity:.9,side:Sr})',
    ),
    (
        '3D: iç profil malzemesi gerçek folyo dokusu',
        'Fe=new Pn({color:gr(ue.fill),roughness:ue.woodgrain?.58:.36,metalness:.06})',
        'Fe=(window.OZKV?OZKV.mat3D:(m=>m))(new Pn({color:gr(ue.fill),roughness:ue.woodgrain?.58:.36,metalness:.06}),ue,dg)',
    ),
    (
        '3D: dış profil malzemesi gerçek folyo dokusu',
        'rt=new Pn({color:gr(O.fill),roughness:O.woodgrain?.58:.36,metalness:.08})',
        'rt=(window.OZKV?OZKV.mat3D:(m=>m))(new Pn({color:gr(O.fill),roughness:O.woodgrain?.58:.36,metalness:.08}),O,dg)',
    ),
    (
        '3D: sahne ortam ışığı + doku yönü + tema arka planı',
        'f.current&&(f.current.target.set(0,Z/2,0),f.current.update())},[E,i,e,r,g,l])',
        'f.current&&(f.current.target.set(0,Z/2,0),f.current.update()),window.OZKV&&OZKV.fix3D(j,dg,h.current)},[E,i,e,r,g,l])',
    ),
]

for patch in PATCHES:
    name, old, new = patch[:3]
    expected = patch[3] if len(patch) > 3 else 1
    n = js.count(old)
    if n != expected:
        sys.exit(f'YAMA EŞLEŞMEDİ ({n} kez, beklenen {expected}): {name}\n  aranan: {old[:120]}')
    js = js.replace(old, new)
    print(f'  ✓ {name}')

# Çizim tuvali: koyu tuval renk sabitleri → kâğıt (teklif) karşılıkları (6.0'ın kendi paleti)
CANVAS_TO_PAPER = {
    '#94a3b8': '#475569', '#38bdf8': '#0284c7', '#7dd3fc': '#0369a1', '#334155': '#94a3b8', '#fbbf24': '#b45309',
    '#0a0d12': '#ffffff', '#f87171': '#b91c1c', '#60a5fa': '#0055a5', '#e2e8f0': '#0f172a', '#1e293b': '#f1f5f9',
    '#475569': '#94a3b8', '#cbd5e1': '#334155', '#c7d2fe': '#312e81', '#fcd34d': '#b45309', '#93c5fd': '#002b5c',
    '#fde68a': '#92400e', '#0c4a6e': '#e0f2fe', '#064e3b': '#f0fdf4', '#6ee7b7': '#047857', '#fca5a5': '#991b1b',
    '#78350f': '#fef3c7', '#14532d': '#dcfce7', '#4ade80': '#16a34a', '#312e81': '#e0e7ff', '#818cf8': '#4f46e5',
    '#f59e0b': '#b45309',
}
canvas_rules = []
for c, p in CANVAS_TO_PAPER.items():
    canvas_rules.append(f"html[data-ozk-theme='day'] svg.ozk-canvas [fill='{c}']{{fill:{p}}}")
    canvas_rules.append(f"html[data-ozk-theme='day'] svg.ozk-canvas [stroke='{c}']{{stroke:{p}}}")
canvas_rules.append("html[data-ozk-theme='day'] svg.ozk-canvas [stroke='#f8fafc']{stroke:#0f172a}")
canvas_rules.append("html[data-ozk-theme='day'] svg.ozk-canvas text[fill='#f8fafc']{fill:#0f172a}")
canvas_rules.append("html[data-ozk-theme='day'] svg.ozk-canvas rect[fill='#0f172a']{fill:#ffffff}")
canvas_css = '\n'.join(canvas_rules)

theme_css = (GOR / 'ozk-theme.css').read_text(encoding='utf-8')
theme_css = theme_css.replace('__OZK_CANVAS_DAY__', canvas_css)

# ------------------------------------------------------------ dokular + kartela
rehau = json.loads((GOR / 'rehau_kartela.json').read_text(encoding='utf-8'))
tex = {}
for r in rehau:
    p = GOR / 'dokular' / f"{r['tex']}.jpg"
    tex[r['tex']] = 'data:image/jpeg;base64,' + base64.b64encode(p.read_bytes()).decode()
# Mevcut 6.0 ahşap renkleri için eşleşen dokular da paketlenir (p03 genel damar)
for extra in ('p03', 'p04', 'p05', 'p06', 'p10'):
    if extra not in tex:
        tex[extra] = 'data:image/jpeg;base64,' + base64.b64encode((GOR / 'dokular' / f'{extra}.jpg').read_bytes()).decode()

ozkv = (GOR / 'ozk-visual.js').read_text(encoding='utf-8')
ozkv = ozkv.replace('__OZK_TEX__', json.dumps(tex)).replace('__OZK_REHAU__', json.dumps(rehau, ensure_ascii=False))

# -------------------------------------------------------------------- birleştir
out = html[:i] + js + html[j:]
out = out.replace('<title>Özkanoğlu PenCAD 6.0 Stüdyo</title>', '<title>Özkanoğlu PenCAD 6.1 Stüdyo</title>', 1)
inject = f'<style id="ozk-theme">\n{theme_css}\n</style>\n<script>\n{ozkv}\n</script>\n'
k = out.index(MOD_OPEN)
out = out[:k] + inject + out[k:]
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(out, encoding='utf-8')
print(f'\n→ {OUT.relative_to(ROOT)}  ({len(out)/1024/1024:.2f} MB, {len(rehau)} REHAU rengi)')
