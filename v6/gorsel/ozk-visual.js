/* ==========================================================================
   Özkanoğlu PenCAD 6.1 — Görsel Katman (OZKV)
   --------------------------------------------------------------------------
   Bu dosya 6.0'ın hesap/fiyat/veri mantığına DOKUNMAZ. Sadece:
     • cam türlerine göre gerçekçi cam görselleri (SVG + 3D)
     • gerçekçi doğrama profili (gönye, ışık-gölge, conta, folyo dokusu)
     • REHAU renk kartelası (44 renk, gerçek folyo dokusu)
     • cam adlarının 8 dilde karşılığı (teklif)
     • gündüz / gece / otomatik tema + göz koruma (mavi ışık filtresi)
   Her fonksiyon hata yakalar; bir sorun olursa orijinal 6.0 çizimi aynen kalır.
   ========================================================================== */
(function () {
  'use strict'
  var TEX = __OZK_TEX__ // { p03: "data:image/jpeg;base64,...", ... }
  var ASSETS = __OZK_ASSETS__ // antet, profil kesitleri vb.
  var NEW_ADDRESS = 'Fatih Mah. Şht. A.Kadir Acar Sok. No: 8/A Merkez / ÇANKIRI — TÜRKİYE'
  var REHAU = __OZK_REHAU__ // kartela verisi

  /* ---------------------------------------------------------------- yardımcı */
  function hexKey(h) {
    return String(h || '').trim().toLowerCase()
  }
  function rng(seed) {
    var s = seed >>> 0
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0
      return s / 4294967296
    }
  }

  /* ------------------------------------------------- REHAU renkleri → katalog */
  var rehauColors = {}
  var texByColorKey = {}
  REHAU.forEach(function (r) {
    var nm = r.nameTR + ' (REHAU ' + r.series + (r.code ? ' · ' + r.code : '') + ')'
    rehauColors[r.key] = {
      key: r.key,
      code: r.code || r.renolit,
      name: nm,
      tier: 'colored',
      fill: r.fill,
      stroke: r.stroke,
      woodgrain: r.kind === 'wood' ? true : undefined,
      matte: /matt/i.test(r.nameEN) ? true : undefined,
      category: 'other',
      rehau: { series: r.series, renolit: r.renolit, nameEN: r.nameEN, kind: r.kind },
    }
    texByColorKey[r.key] = r.tex
  })
  // 6.0'daki mevcut ahşap renklerini aynı desenin gerçek dokusuna bağla
  var LEGACY_TEX = {
    GOLDEN_OAK: 'p06', WINCHESTER: 'p05', IRISH_OAK: 'p04', DARK_OAK: 'p10',
    ANTHRACITE: 'p20', ANTHRACITE_SMOOTH: 'p21', TROMPET: 'p46', BLACK: 'p35', QUARTZ_GREY: 'p16',
  }

  /* Kullanıcının eklediği renkler (Katalog'a kalıcı eklenir; fiyat sınıfı: renkli) */
  var CKEY = 'ozk.customColors'
  function customColors() {
    try {
      var list = JSON.parse(localStorage.getItem(CKEY) || '[]')
      var o = {}
      list.forEach(function (c) {
        if (c && c.key && c.fill) o[c.key] = { key: c.key, code: c.code || '-', name: c.name, tier: 'colored', fill: c.fill, stroke: c.stroke || c.fill, woodgrain: c.woodgrain || undefined, category: 'other', custom: true }
      })
      return o
    } catch (e) {
      return {}
    }
  }
  function extraColors() {
    var o = {}
    for (var k in rehauColors) o[k] = rehauColors[k]
    var c = customColors()
    for (var k2 in c) o[k2] = c[k2]
    return o
  }

  function texFor(color) {
    if (!color) return null
    var k = color.key
    if (texByColorKey[k] && TEX[texByColorKey[k]]) return { id: texByColorKey[k], mode: 'replace' }
    if (LEGACY_TEX[k] && TEX[LEGACY_TEX[k]]) return { id: LEGACY_TEX[k], mode: 'replace' }
    if (color.woodgrain) return { id: 'grain', mode: 'blend' }
    return null
  }

  /* ---------------------------------------------- çalışma anı dokuları (cam) */
  var GEN = {}
  function genTextures() {
    try {
      var c = document.createElement('canvas')
      // Satina: ince asit gravür kumlama tanesi
      c.width = c.height = 160
      var x = c.getContext('2d')
      var r = rng(91)
      var img = x.createImageData(160, 160)
      for (var i = 0; i < img.data.length; i += 4) {
        var v = 228 + Math.floor(r() * 27)
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v
        img.data[i + 3] = Math.floor(70 + r() * 90)
      }
      x.putImageData(img, 0, 0)
      GEN.satin = c.toDataURL('image/png')
      // Buzlu / desenli cam: organik çakıl-kristal kabartma
      var d = document.createElement('canvas')
      d.width = d.height = 220
      var y = d.getContext('2d')
      var r2 = rng(7)
      y.fillStyle = 'rgba(255,255,255,0.35)'
      y.fillRect(0, 0, 220, 220)
      for (var k = 0; k < 340; k++) {
        var px = r2() * 220,
          py = r2() * 220,
          rad = 3 + r2() * 9
        var g = y.createRadialGradient(px - rad * 0.35, py - rad * 0.35, 0, px, py, rad)
        g.addColorStop(0, 'rgba(255,255,255,0.85)')
        g.addColorStop(0.55, 'rgba(255,255,255,0.25)')
        g.addColorStop(1, 'rgba(120,140,160,0.18)')
        y.fillStyle = g
        y.beginPath()
        y.arc(px, py, rad, 0, Math.PI * 2)
        y.fill()
        // kenar sarma (dikişsiz)
        if (px < rad || px > 220 - rad || py < rad || py > 220 - rad) {
          ;[-220, 0, 220].forEach(function (ox) {
            ;[-220, 0, 220].forEach(function (oy) {
              if (!ox && !oy) return
              y.beginPath()
              y.arc(px + ox, py + oy, rad, 0, Math.PI * 2)
              y.fill()
            })
          })
        }
      }
      GEN.pattern = d.toDataURL('image/png')
      // Genel ahşap damarı (dokusu olmayan ahşap renkler için, soft-light)
      if (TEX.p03) {
        var im = new Image()
        im.onload = function () {
          var e = document.createElement('canvas')
          e.width = im.width
          e.height = im.height
          var z = e.getContext('2d')
          z.drawImage(im, 0, 0)
          var data = z.getImageData(0, 0, e.width, e.height)
          var sum = 0
          for (var j = 0; j < data.data.length; j += 4) sum += data.data[j] * 0.3 + data.data[j + 1] * 0.59 + data.data[j + 2] * 0.11
          var mean = sum / (data.data.length / 4)
          for (var j2 = 0; j2 < data.data.length; j2 += 4) {
            var l = data.data[j2] * 0.3 + data.data[j2 + 1] * 0.59 + data.data[j2 + 2] * 0.11
            var vv = Math.max(0, Math.min(255, 128 + (l - mean) * 2.2))
            data.data[j2] = data.data[j2 + 1] = data.data[j2 + 2] = vv
          }
          z.putImageData(data, 0, 0)
          TEX.grain = e.toDataURL('image/jpeg', 0.8)
        }
        im.src = TEX.p03
      }
    } catch (e) {}
  }

  /* ------------------------------------------------------- cam sınıflandırma */
  var G_CACHE = {}
  function classify(g) {
    if (!g) return { style: 'clear', igu: true, triple: false }
    var ck = g.key + '|' + g.name
    if (G_CACHE[ck]) return G_CACHE[ck]
    // Tür, kategoriden değil camın kendi adından/kodundan belirlenir (kategoriler birden çok türü kapsar)
    var n = (String(g.name || '') + ' ' + String(g.key || '')).toLocaleLowerCase('tr')
    var cat = String(g.category || '')
    var single = /tek camlar/i.test(cat) || (!/\d\s*\+\s*\d/.test(String(g.name)) && !/ısıcam|isicam/.test(n))
    if (/^LMN/.test(g.key) || /^STN/.test(g.key)) single = true
    var compM = String(g.name || '').match(/^\s*(\d+(?:[.,]\d+)?(?:\s*lamine)?(?:\s*\+\s*\d+(?:[.,]\d+)?)+)/i)
    var triple = /üçlü|triple/.test(n) || (compM ? (compM[1].match(/\+/g) || []).length >= 4 : false)
    var style = 'clear'
    if (g.panel) style = 'panel'
    else if (/jaluzi/.test(n)) style = 'blinds'
    else if (/satina|satin/.test(n)) style = 'satin'
    else if (/buzlu/.test(n) || g.frosted) style = 'pattern'
    else if (/reflekte|reflective/.test(n)) style = 'reflect'
    else if (/renkli|tinted|füme|bronz/.test(n)) style = 'tint'
    else if (/akustik|acoustic/.test(n)) style = 'lamAc'
    else if (/lamine|vsg|laminated/.test(n)) style = 'lam'
    else if (triple) style = 'triple'
    else if (/konfor|solar/.test(n)) style = 'solar'
    else if (/sinerji|low-?e|lowe/.test(n)) style = 'lowe'
    var r = { style: style, igu: !single && !g.panel, triple: triple }
    G_CACHE[ck] = r
    return r
  }

  /* --------------------------------------------------- cam renk paletleri */
  // [renk, opaklık] × 3 durak — paper: teklif kâğıdı (sabit, baskı dostu)
  var PAPER = {
    clear: [['#e4f3fb', 0.95], ['#bfe0f2', 0.9], ['#e9f6fc', 0.95]],
    lowe: [['#e5f5f1', 0.95], ['#bfe3da', 0.9], ['#eaf7f3', 0.95]],
    solar: [['#e2eaf3', 0.95], ['#bccbdd', 0.9], ['#e7eef6', 0.95]],
    triple: [['#dcf0ea', 0.96], ['#a9d6cb', 0.92], ['#e2f3ee', 0.96]],
    reflect: [['#eef2f6', 1], ['#a7b7c8', 0.95], ['#f2f5f8', 1]],
    tint: [['#efe5d8', 0.96], ['#cdb79d', 0.92], ['#f2eadf', 0.96]],
    lam: [['#e6f4fa', 0.96], ['#c6e3f1', 0.92], ['#ecf7fb', 0.96]],
    lamAc: [['#e7ebf9', 0.96], ['#c5cdf0', 0.92], ['#edf0fb', 0.96]],
    satin: [['#f3f6f8', 0.98], ['#e7edf1', 0.98], ['#f5f8f9', 0.98]],
    pattern: [['#eef3f6', 0.98], ['#dfe7ec', 0.98], ['#f1f5f7', 0.98]],
    blinds: [['#e4f3fb', 0.95], ['#bfe0f2', 0.9], ['#e9f6fc', 0.95]],
  }
  var STYLES = Object.keys(PAPER)

  /* ----------------------------------------------------------- SVG tanımları */
  function stops(n, list, cssPrefix) {
    var offs = ['0%', '52%', '100%']
    return list.map(function (s, i) {
      return n.jsx(
        'stop',
        cssPrefix
          ? { offset: offs[i], style: { stopColor: 'var(' + cssPrefix + i + 'c)', stopOpacity: 'var(' + cssPrefix + i + 'o)' } }
          : { offset: offs[i], stopColor: s[0], stopOpacity: s[1] },
        'st' + i,
      )
    })
  }

  function glassDefs(n, R, P) {
    var out = []
    STYLES.forEach(function (st) {
      var gid = 'ozkgg-' + st + '-' + R
      out.push(
        n.jsx(
          'linearGradient',
          { id: gid, x1: '0%', y1: '0%', x2: '100%', y2: '100%', children: stops(n, PAPER[st], P ? null : '--ozkg-' + st + '-') },
          gid,
        ),
      )
      if (st !== 'satin' && st !== 'pattern' && st !== 'blinds') return
      var pid = 'ozkg-' + st + '-' + R
      var size = st === 'satin' ? 60 : st === 'pattern' ? 110 : 24
      var kids = [n.jsx('rect', { width: 400, height: size, fill: 'url(#' + gid + ')' }, 'b')]
      if (st === 'satin' && GEN.satin)
        kids.push(n.jsx('image', { href: GEN.satin, width: 60, height: 60, opacity: P ? 0.55 : 0.75 }, 'n'))
      if (st === 'pattern' && GEN.pattern)
        kids.push(n.jsx('image', { href: GEN.pattern, width: 110, height: 110, opacity: P ? 0.7 : 0.85 }, 'n'))
      if (st === 'blinds') {
        kids.push(n.jsx('rect', { y: 3, width: 400, height: 17, fill: 'url(#ozkg-slat-' + R + ')' }, 's'))
        kids.push(n.jsx('line', { x1: 0, y1: 20.5, x2: 400, y2: 20.5, stroke: '#64748b', strokeOpacity: 0.35, strokeWidth: 1 }, 'l'))
      }
      out.push(
        n.jsx(
          'pattern',
          { id: pid, patternUnits: 'userSpaceOnUse', width: st === 'blinds' ? 400 : size, height: size, children: kids },
          pid,
        ),
      )
    })
    // Jaluzi lameli
    out.push(
      n.jsx(
        'linearGradient',
        {
          id: 'ozkg-slat-' + R,
          x1: '0',
          y1: '0',
          x2: '0',
          y2: '1',
          children: [
            n.jsx('stop', { offset: '0%', stopColor: '#f8fafc', stopOpacity: 0.95 }, 'a'),
            n.jsx('stop', { offset: '55%', stopColor: '#d5dce3', stopOpacity: 0.95 }, 'b'),
            n.jsx('stop', { offset: '100%', stopColor: '#a9b4bf', stopOpacity: 0.95 }, 'c'),
          ],
        },
        'slat',
      ),
    )
    // Gökyüzü yansıması (parlama bantları)
    var k = P ? 0.55 : 1
    out.push(
      n.jsx(
        'linearGradient',
        {
          id: 'ozk-sheen-' + R,
          x1: '0',
          y1: '0',
          x2: '1',
          y2: '1',
          children: [
            [0, 0],
            [0.13, 0],
            [0.165, 0.32 * k],
            [0.2, 0.05 * k],
            [0.245, 0.17 * k],
            [0.275, 0],
            [0.6, 0],
            [0.68, 0.06 * k],
            [0.78, 0],
            [1, 0],
          ].map(function (s, i) {
            return n.jsx('stop', { offset: s[0], stopColor: '#ffffff', stopOpacity: s[1] }, 'sh' + i)
          }),
        },
        'sheen',
      ),
    )
    // Üstten yumuşak gök ışığı (camın üst yarısı biraz daha aydınlık)
    out.push(
      n.jsx(
        'linearGradient',
        {
          id: 'ozk-sky-' + R,
          x1: '0',
          y1: '0',
          x2: '0',
          y2: '1',
          children: [
            n.jsx('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: P ? 0.22 : 0.16 }, 'a'),
            n.jsx('stop', { offset: '45%', stopColor: '#ffffff', stopOpacity: 0 }, 'b'),
            n.jsx('stop', { offset: '100%', stopColor: '#0b1b2b', stopOpacity: P ? 0.05 : 0.12 }, 'c'),
          ],
        },
        'sky',
      ),
    )
    return out
  }

  // Profil ışık-gölge (eğim) gradyanları: üst/alt/sol/sağ yüz + ortakayıt
  function bevelDefs(n, R, P) {
    var a = P ? 0.62 : 1
    function grad(id, x1, y1, x2, y2, st) {
      return n.jsx(
        'linearGradient',
        {
          id: id + '-' + R,
          x1: x1,
          y1: y1,
          x2: x2,
          y2: y2,
          children: st.map(function (s, i) {
            return n.jsx('stop', { offset: s[0], stopColor: s[1], stopOpacity: s[2] * a }, i)
          }),
        },
        id,
      )
    }
    var face = [
      [0, '#ffffff', 0.3],
      [0.12, '#ffffff', 0.1],
      [0.5, '#ffffff', 0],
      [0.84, '#000000', 0.04],
      [0.95, '#000000', 0.11],
      [1, '#000000', 0.22],
    ]
    var faceDark = [
      [0, '#000000', 0.05],
      [0.14, '#000000', 0.015],
      [0.5, '#000000', 0],
      [0.84, '#000000', 0.04],
      [0.95, '#000000', 0.11],
      [1, '#000000', 0.22],
    ]
    var bar = [
      [0, '#000000', 0.3],
      [0.07, '#000000', 0.08],
      [0.3, '#ffffff', 0.16],
      [0.5, '#ffffff', 0.05],
      [0.86, '#000000', 0.05],
      [0.93, '#000000', 0.12],
      [1, '#000000', 0.32],
    ]
    return [
      grad('ozkb-t', '0', '0', '0', '1', face),
      grad('ozkb-l', '0', '0', '1', '0', face),
      grad('ozkb-r', '1', '0', '0', '0', faceDark),
      grad('ozkb-b', '0', '1', '0', '0', faceDark),
      grad('ozkb-mv', '0', '0', '1', '0', bar),
      grad('ozkb-mh', '0', '0', '0', '1', bar),
    ]
  }

  var TW = 240,
    TH = 274
  function texPatterns(n, R, ckey, tex) {
    var src = TEX[tex.id]
    if (!src) return []
    function pat(dir) {
      var id = 'ozkw-' + ckey + '-' + dir + '-' + R
      return n.jsx(
        'pattern',
        {
          id: id,
          patternUnits: 'userSpaceOnUse',
          width: TW,
          height: TH * 2,
          patternTransform: dir === 'h' ? 'rotate(90)' : undefined,
          children: [
            n.jsx('image', { href: src, width: TW, height: TH, preserveAspectRatio: 'none' }, 'a'),
            n.jsx('image', { href: src, width: TW, height: TH, preserveAspectRatio: 'none', transform: 'translate(0,' + TH * 2 + ') scale(1,-1)' }, 'b'),
          ],
        },
        id,
      )
    }
    return [pat('v'), pat('h')]
  }

  // Çizim başına: kullanılan renk → doku eşlemesi (fill hex → renk)
  var HEX = {}

  function defs(n, R, P, t, i, L) {
    try {
      var out = glassDefs(n, R, P).concat(bevelDefs(n, R, P))
      var keys = {}
      ;[i && i.color, i && i.colorOutside].forEach(function (k) {
        if (k) keys[k] = 1
      })
      ;(L || []).forEach(function (u) {
        var p = u && u.unitPos
        if (p) {
          if (p.color) keys[p.color] = 1
          if (p.colorOutside) keys[p.colorOutside] = 1
        }
      })
      Object.keys(keys).forEach(function (k) {
        var c = t && t.colors && t.colors[k]
        if (!c) return
        var tx = texFor(c)
        if (!tx) return
        HEX[R + '|' + hexKey(c.fill)] = { key: k, tex: tx }
        out = out.concat(texPatterns(n, R, k, tx))
      })
      return out
    } catch (e) {
      return []
    }
  }

  /* --------------------------------------------------------------- cam dolgu */
  function glassFill(g, R, P) {
    try {
      var c = classify(g)
      if (c.style === 'panel') return null
      if (c.style === 'satin' || c.style === 'pattern' || c.style === 'blinds') return 'url(#ozkg-' + c.style + '-' + R + ')'
      return 'url(#ozkgg-' + c.style + '-' + R + ')'
    } catch (e) {
      return null
    }
  }

  function paneFx(n, r, g, P, O, R) {
    try {
      if (!r || !g || g.panel || r.w < 30 || r.h < 30) return null
      var c = classify(g)
      var kids = []
      kids.push(n.jsx('rect', { x: r.x, y: r.y, width: r.w, height: r.h, fill: 'url(#ozk-sky-' + R + ')' }, 'sky'))
      if (c.style !== 'satin' && c.style !== 'pattern')
        kids.push(n.jsx('rect', { x: r.x, y: r.y, width: r.w, height: r.h, fill: 'url(#ozk-sheen-' + R + ')', opacity: c.style === 'reflect' ? 1.6 : 1 }, 'sheen'))
      var ins = Math.min(5, r.w / 30, r.h / 30)
      if (c.igu) {
        // Isıcam ara çıtası (warm-edge) — cam kenarında koyu ince bant
        var sw = Math.max(O * 1.1, 7)
        kids.push(
          n.jsx(
            'rect',
            {
              x: r.x + ins + sw / 2,
              y: r.y + ins + sw / 2,
              width: Math.max(1, r.w - 2 * ins - sw),
              height: Math.max(1, r.h - 2 * ins - sw),
              fill: 'none',
              className: 'ozk-spacer',
              stroke: P ? '#6b7280' : 'var(--ozk-spacer)',
              strokeOpacity: P ? 0.55 : 0.85,
              strokeWidth: sw,
            },
            'sp',
          ),
        )
        if (c.triple)
          kids.push(
            n.jsx(
              'rect',
              {
                x: r.x + ins + sw * 1.9,
                y: r.y + ins + sw * 1.9,
                width: Math.max(1, r.w - 2 * ins - sw * 3.8),
                height: Math.max(1, r.h - 2 * ins - sw * 3.8),
                fill: 'none',
                stroke: P ? '#9ca3af' : 'var(--ozk-spacer)',
                strokeOpacity: P ? 0.35 : 0.45,
                strokeWidth: Math.max(1, sw * 0.35),
              },
              'sp2',
            ),
          )
      }
      if (c.style === 'lam' || c.style === 'lamAc') {
        kids.push(
          n.jsx(
            'rect',
            {
              x: r.x + 2,
              y: r.y + 2,
              width: Math.max(1, r.w - 4),
              height: Math.max(1, r.h - 4),
              fill: 'none',
              stroke: c.style === 'lamAc' ? '#a5b4fc' : '#ffffff',
              strokeOpacity: P ? 0.9 : 0.55,
              strokeWidth: Math.max(1.2, O * 0.55),
              strokeDasharray: c.style === 'lamAc' ? O * 3 + ' ' + O * 1.5 : undefined,
            },
            'lm',
          ),
        )
      }
      return n.jsx('g', { pointerEvents: 'none', children: kids }, 'ozkfx')
    } catch (e) {
      return null
    }
  }

  /* ------------------------------------------------- gerçekçi profil halkası */
  function pts(a) {
    return a
      .map(function (p) {
        return p[0] + ',' + p[1]
      })
      .join(' ')
  }

  function ring(n, R, P, O, orig, Ee, ke, $, z, D, me, We, be) {
    var base = orig(Ee, ke, $, z, D, me, We, be)
    try {
      var e = Math.min(D, $ / 3, z / 3),
        lt = be ? 20 : e
      if (!(e > 0)) return base
      var faces = {
        t: [[Ee, ke], [Ee + $, ke], [Ee + $ - e, ke + e], [Ee + e, ke + e]],
        l: [[Ee, ke], [Ee + e, ke + e], [Ee + e, ke + z - lt], [Ee, ke + z]],
        r: [[Ee + $, ke], [Ee + $, ke + z], [Ee + $ - e, ke + z - lt], [Ee + $ - e, ke + e]],
      }
      if (!be) faces.b = [[Ee, ke + z], [Ee + e, ke + z - e], [Ee + $ - e, ke + z - e], [Ee + $, ke + z]]
      var info = HEX[R + '|' + hexKey(me)]
      var kids = [base]
      Object.keys(faces).forEach(function (f) {
        var p = pts(faces[f])
        if (info) {
          var dir = f === 't' || f === 'b' ? 'h' : 'v'
          kids.push(
            n.jsx(
              'polygon',
              {
                points: p,
                fill: 'url(#ozkw-' + info.key + '-' + dir + '-' + R + ')',
                style: info.tex.mode === 'blend' ? { mixBlendMode: 'soft-light' } : undefined,
                opacity: info.tex.mode === 'blend' ? 0.9 : 1,
              },
              'w' + f,
            ),
          )
        }
        kids.push(n.jsx('polygon', { points: p, fill: 'url(#ozkb-' + f + '-' + R + ')' }, 'b' + f))
        kids.push(n.jsx('polygon', { points: p, fill: 'none', stroke: We, strokeWidth: O * 0.55, strokeOpacity: 0.75, strokeLinejoin: 'round' }, 'o' + f))
      })
      // İç conta (EPDM) çizgisi
      var g = [[Ee + e, ke + z - lt], [Ee + e, ke + e], [Ee + $ - e, ke + e], [Ee + $ - e, ke + z - lt]]
      if (!be) g.push([Ee + e, ke + z - lt])
      kids.push(
        n.jsx(
          'polyline',
          {
            points: pts(g),
            fill: 'none',
            stroke: P ? '#334155' : '#111418',
            strokeOpacity: P ? 0.45 : 0.6,
            strokeWidth: Math.max(1, O * 0.9),
            strokeLinejoin: 'miter',
          },
          'gs',
        ),
      )
      return n.jsx('g', { children: kids })
    } catch (e2) {
      return base
    }
  }

  function bar(n, R, P, O, ge, me, be) {
    var vert = ge.dir === 'v'
    var x = vert ? ge.axis - me / 2 : ge.from,
      y = vert ? ge.from : ge.axis - me / 2,
      w = vert ? me : ge.to - ge.from,
      h = vert ? ge.to - ge.from : me
    var kids = [n.jsx('rect', { x: x, y: y, width: w, height: h, fill: be.fill, stroke: be.stroke, strokeWidth: O }, 'base')]
    try {
      var info = HEX[R + '|' + hexKey(be.fill)]
      if (info)
        kids.push(
          n.jsx(
            'rect',
            {
              x: x,
              y: y,
              width: w,
              height: h,
              fill: 'url(#ozkw-' + info.key + '-' + (vert ? 'v' : 'h') + '-' + R + ')',
              style: info.tex.mode === 'blend' ? { mixBlendMode: 'soft-light' } : undefined,
              opacity: info.tex.mode === 'blend' ? 0.9 : 1,
            },
            'w',
          ),
        )
      kids.push(n.jsx('rect', { x: x, y: y, width: w, height: h, fill: 'url(#ozkb-' + (vert ? 'mv' : 'mh') + '-' + R + ')' }, 'bv'))
      kids.push(n.jsx('rect', { x: x, y: y, width: w, height: h, fill: 'none', stroke: be.stroke, strokeWidth: O * 0.55, strokeOpacity: 0.75 }, 'o'))
    } catch (e) {}
    return n.jsx('g', { children: kids }, ge.id)
  }

  /* -------------------------------------------------- cam adı — 8 dil */
  var GT = {
    EN: { igu: 'Insulating glass unit', triple: 'Triple glazing', lowe: 'Low-E (Sinerji)', doubleLowe: 'double Low-E (Sinerji)', solar: 'solar-control Low-E (Konfor)', inLoweOutSolar: 'inner Low-E / outer solar-control', satin: 'satin, acid-etched', frosted: 'frosted / patterned', laminated: 'laminated safety glass (VSG)', acoustic: 'acoustic laminated', tempered: 'tempered (ESG)', bothTempered: 'both panes tempered', reflective: 'reflective', tinted: 'tinted outer pane', blinds: 'integrated blinds', float: 'Float glass', lamGlass: 'Laminated safety glass', satinGlass: 'Satin glass', frostedGlass: 'Frosted glass', sandwich: 'Sandwich panel', deco: 'Decorative door panel' },
    DE: { igu: 'Isolierglas', triple: 'Dreifach-Isolierglas', lowe: 'Wärmeschutz Low-E (Sinerji)', doubleLowe: 'zweifach Low-E (Sinerji)', solar: 'Sonnenschutz Low-E (Konfor)', inLoweOutSolar: 'innen Low-E / außen Sonnenschutz', satin: 'satiniert', frosted: 'Ornamentglas, matt', laminated: 'Verbundsicherheitsglas (VSG)', acoustic: 'Schallschutz-VSG', tempered: 'Einscheibensicherheitsglas (ESG)', bothTempered: 'beidseitig ESG', reflective: 'Reflexionsglas', tinted: 'Außenscheibe getönt', blinds: 'mit integrierter Jalousie', float: 'Floatglas', lamGlass: 'Verbundsicherheitsglas (VSG)', satinGlass: 'Satinatoglas', frostedGlass: 'Ornamentglas', sandwich: 'Sandwichpaneel', deco: 'Dekor-Türfüllung' },
    NL: { igu: 'Isolatieglas (HR)', triple: 'Triple beglazing (HR+++)', lowe: 'Low-E (Sinerji)', doubleLowe: 'dubbel Low-E (Sinerji)', solar: 'zonwerend Low-E (Konfor)', inLoweOutSolar: 'binnen Low-E / buiten zonwerend', satin: 'gesatineerd', frosted: 'figuurglas, mat', laminated: 'gelaagd veiligheidsglas', acoustic: 'akoestisch gelaagd', tempered: 'gehard (ESG)', bothTempered: 'beide ruiten gehard', reflective: 'reflecterend', tinted: 'getinte buitenruit', blinds: 'met geïntegreerde jaloezie', float: 'Floatglas', lamGlass: 'Gelaagd veiligheidsglas', satinGlass: 'Satijnglas', frostedGlass: 'Figuurglas', sandwich: 'Sandwichpaneel', deco: 'Decoratief deurpaneel' },
    FR: { igu: 'Double vitrage isolant', triple: 'Triple vitrage', lowe: 'faible émissivité (Sinerji)', doubleLowe: 'double faible émissivité (Sinerji)', solar: 'contrôle solaire (Konfor)', inLoweOutSolar: 'int. faible émissivité / ext. contrôle solaire', satin: 'satiné à l’acide', frosted: 'imprimé, dépoli', laminated: 'feuilleté de sécurité', acoustic: 'feuilleté acoustique', tempered: 'trempé', bothTempered: 'deux vitres trempées', reflective: 'réfléchissant', tinted: 'vitre extérieure teintée', blinds: 'store intégré', float: 'Verre float', lamGlass: 'Verre feuilleté de sécurité', satinGlass: 'Verre satiné', frostedGlass: 'Verre imprimé', sandwich: 'Panneau sandwich', deco: 'Panneau de porte décoratif' },
    IT: { igu: 'Vetrocamera', triple: 'Triplo vetro', lowe: 'basso emissivo (Sinerji)', doubleLowe: 'doppio basso emissivo (Sinerji)', solar: 'controllo solare (Konfor)', inLoweOutSolar: 'int. basso emissivo / est. controllo solare', satin: 'satinato all’acido', frosted: 'stampato, opaco', laminated: 'stratificato di sicurezza', acoustic: 'stratificato acustico', tempered: 'temperato', bothTempered: 'entrambe le lastre temperate', reflective: 'riflettente', tinted: 'lastra esterna colorata', blinds: 'con veneziana integrata', float: 'Vetro float', lamGlass: 'Vetro stratificato di sicurezza', satinGlass: 'Vetro satinato', frostedGlass: 'Vetro stampato', sandwich: 'Pannello sandwich', deco: 'Pannello porta decorativo' },
    RU: { igu: 'Однокамерный стеклопакет', triple: 'Двухкамерный стеклопакет', lowe: 'энергосберегающий Low-E (Sinerji)', doubleLowe: 'двойной Low-E (Sinerji)', solar: 'солнцезащитный Low-E (Konfor)', inLoweOutSolar: 'внутр. Low-E / наруж. солнцезащитный', satin: 'сатинированный', frosted: 'узорчатый матовый', laminated: 'триплекс', acoustic: 'шумозащитный триплекс', tempered: 'закалённый', bothTempered: 'оба стекла закалённые', reflective: 'зеркальный (отражающий)', tinted: 'тонированное наружное стекло', blinds: 'со встроенными жалюзи', float: 'Флоат-стекло', lamGlass: 'Триплекс', satinGlass: 'Сатинированное стекло', frostedGlass: 'Узорчатое стекло', sandwich: 'Сэндвич-панель', deco: 'Декоративная дверная панель' },
    AR: { igu: 'زجاج عازل مزدوج', triple: 'زجاج عازل ثلاثي', lowe: 'منخفض الانبعاث (Sinerji)', doubleLowe: 'منخفض الانبعاث مزدوج (Sinerji)', solar: 'تحكم شمسي منخفض الانبعاث (Konfor)', inLoweOutSolar: 'داخلي منخفض الانبعاث / خارجي تحكم شمسي', satin: 'ساتان مُعالج بالحمض', frosted: 'منقوش مثلّج', laminated: 'زجاج أمان مصفّح', acoustic: 'مصفّح عازل للصوت', tempered: 'مقسّى', bothTempered: 'اللوحان مقسّيان', reflective: 'عاكس', tinted: 'لوح خارجي ملوّن', blinds: 'بستائر مدمجة', float: 'زجاج فلوت', lamGlass: 'زجاج أمان مصفّح', satinGlass: 'زجاج ساتان', frostedGlass: 'زجاج منقوش', sandwich: 'لوح ساندويتش', deco: 'لوح باب زخرفي' },
  }

  function gName(g, lang) {
    try {
      if (!g) return ''
      var name = String(g.name || '')
      var T = GT[String(lang || 'TR').toUpperCase()]
      if (!T) return name // TR ve bilinmeyen dil: Furkan'ın orijinal adı
      var low = name.toLocaleLowerCase('tr')
      if (g.panel) {
        var mm = (name.match(/^\s*(\d+)\s*mm/i) || [])[1]
        return /dekor/i.test(low) ? T.deco + (name.match(/\b0\d{4}s\b/i) ? ' ' + name.match(/\b0\d{4}s\b/i)[0] : '') : (mm ? mm + ' mm ' : '') + T.sandwich
      }
      var comp = ''
      var m = name.match(/^\s*(\d+(?:[.,]\d+)?(?:\s*lamine)?(?:\s*\+\s*\d+(?:[.,]\d+)?)+)/i)
      if (m) comp = m[1].replace(/\s*lamine/i, '').replace(/\s+/g, '')
      else {
        var m2 = name.match(/^\s*(\d+(?:[.,]\d+)?)\s*mm/i)
        if (m2) comp = m2[1] + ' mm'
      }
      var c = classify(g)
      var f = []
      var doubleL = /çift\s*(yuz|yüz)?\s*sinerji/i.test(low)
      var inOut = /iç\s*sinerji\s*dış\s*konfor/i.test(low)
      if (inOut) f.push(T.inLoweOutSolar)
      else if (doubleL) f.push(T.doubleLowe)
      else {
        if (/konfor/.test(low)) f.push(T.solar)
        if (/sinerji/.test(low)) f.push(T.lowe)
        else if (/low-?e|lowe/.test(low)) f.push(T.lowe.replace(/\s*\(Sinerji\)/, ''))
      }
      if (/satina/.test(low)) f.push(T.satin)
      if (/buzlu/.test(low)) f.push(T.frosted)
      if (/akustik/.test(low)) f.push(T.acoustic)
      else if (/lamine|vsg/.test(low)) f.push(T.laminated)
      if (/çift taraf temper|dc temper \+ dc temper/.test(low)) f.push(T.bothTempered)
      else if (/temper/.test(low)) f.push(T.tempered)
      if (/reflekte/.test(low)) f.push(T.reflective)
      if (/renkli/.test(low)) f.push(T.tinted)
      if (/jaluzi/.test(low)) f.push(T.blinds)
      var type
      if (c.igu) type = c.triple ? T.triple : T.igu
      else if (/lamine/.test(low)) {
        type = T.lamGlass
        f = f.filter(function (x) {
          return x !== T.laminated
        })
      } else if (/satina/.test(low)) {
        type = T.satinGlass
        f = f.filter(function (x) {
          return x !== T.satin
        })
      } else if (/buzlu/.test(low)) {
        type = T.frostedGlass
        f = f.filter(function (x) {
          return x !== T.frosted
        })
      } else type = T.float
      if (!comp && !f.length && !/düzcam|isıcam|lamine|satina|buzlu|jaluzi|üçlü/.test(low)) return name
      return (comp ? comp + ' ' : '') + type + (f.length ? ' — ' + f.join(', ') : '')
    } catch (e) {
      return g && g.name
    }
  }

  /* ------------------------------------------------------------------ 3D */
  var IMG = {}
  function imgFor(id) {
    if (IMG[id]) return IMG[id]
    var im = new Image()
    im.src = TEX[id]
    IMG[id] = im
    return im
  }

  function mat3D(mat, color, CT) {
    try {
      var tx = texFor(color)
      if (!tx || tx.mode !== 'replace' || !CT || !TEX[tx.id]) return mat
      var im = imgFor(tx.id)
      var t = new CT(im)
      t.wrapS = t.wrapT = 1000 // RepeatWrapping
      t.colorSpace = 'srgb'
      t.anisotropy = 4
      if (im.complete) t.needsUpdate = true
      else
        im.addEventListener('load', function () {
          t.needsUpdate = true
        })
      mat.map = t
      mat.color && mat.color.set && mat.color.set(0xffffff)
      mat.roughness = 0.62
      mat.userData = mat.userData || {}
      mat.userData.ozkTex = true
      mat.needsUpdate = true
    } catch (e) {}
    return mat
  }

  var G3 = {
    clear: { color: 0x8fd3f0, opacity: 0.3 },
    lowe: { color: 0x93d6cb, opacity: 0.32 },
    solar: { color: 0x8eaccd, opacity: 0.4 },
    triple: { color: 0x7fcbbf, opacity: 0.4 },
    reflect: { color: 0xb9c9d9, opacity: 0.74, metalness: 0.65, roughness: 0.04 },
    tint: { color: 0x9a7b5a, opacity: 0.52 },
    lam: { color: 0xa9dcf2, opacity: 0.36 },
    lamAc: { color: 0xb3bff0, opacity: 0.38 },
    satin: { color: 0xeef3f6, opacity: 0.84, roughness: 0.62, metalness: 0 },
    pattern: { color: 0xe6edf2, opacity: 0.8, roughness: 0.5, metalness: 0 },
    blinds: { color: 0xdfe6ec, opacity: 0.78, roughness: 0.45, metalness: 0 },
  }
  function glass3D(g, base) {
    try {
      var c = classify(g)
      var o = G3[c.style]
      if (!o) return base
      var r = {}
      for (var k in base) r[k] = base[k]
      for (var k2 in o) r[k2] = o[k2]
      r.envMapIntensity = 1.25
      return r
    } catch (e) {
      return base
    }
  }


  /* ============================================= 3D GERÇEKÇİLİK (6.2) */
  function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x
  }
  function ease(x) {
    x = clamp01(x)
    return x * x * (3 - 2 * x)
  }
  // Cam dizilimi: "4+16+4+16+4" → [4,16,4,16,4]; "44+12+4" → lamine 8.76 + 12 + 4
  function glassStack(g) {
    var name = String((g && g.name) || '')
    var total = (g && g.thicknessMm) || 24
    var m = name.match(/^\s*(\d+(?:[.,]\d+)?(?:\s*lamine)?(?:\s*\+\s*\d+(?:[.,]\d+)?)+)/i)
    var parts = []
    if (m) {
      m[1].split('+').forEach(function (t, i) {
        var v = parseFloat(t.replace(',', '.'))
        if (!(v > 0)) return
        if (i % 2 === 0) {
          // 44 / 33 / 55 / 44.2 → iki cam + PVB
          var lam = /^\s*(\d)\1(?:[.,]\d)?\s*$/.test(t.replace(/lamine/i, '')) || /lamine/i.test(t)
          if (lam && v >= 11) {
            var a = Math.floor(v / 10)
            parts.push({ glass: true, t: a * 2 + 0.76, lam: true })
          } else parts.push({ glass: true, t: v })
        } else parts.push({ glass: false, t: v })
      })
    }
    if (!parts.length || !parts[0].glass) {
      if (total <= 12) parts = [{ glass: true, t: total }]
      else parts = [{ glass: true, t: 4 }, { glass: false, t: total - 8 }, { glass: true, t: 4 }]
    }
    var sum = parts.reduce(function (a, b) {
      return a + b.t
    }, 0)
    var k = Math.abs(sum - total) > 2 && total > 0 ? total / sum : 1
    parts.forEach(function (x) {
      x.t *= k
    })
    return parts
  }
  // Tek kutu cam → gerçek katmanlar: cam levhaları, aradaki boşluk, ara çıta (warm-edge), lamine PVB
  function glassLayers(mesh, g, pane) {
    try {
      if (!mesh || !mesh.geometry || !mesh.material || !g || g.panel || (pane && pane.panelModel)) return
      var mat = mesh.material
      if (!mat.transparent) return
      var P = mesh.geometry.parameters
      if (!P || !P.width || !P.height) return
      var W = P.width,
        H = P.height,
        U = 0.001
      var parts = glassStack(g)
      var nGlass = parts.filter(function (x) {
        return x.glass
      }).length
      var Box = mesh.geometry.constructor,
        Mesh = mesh.constructor,
        Mat = mat.constructor
      var op = mat.opacity == null ? 0.34 : mat.opacity
      var a = 1 - Math.pow(1 - Math.min(0.92, op), 1 / Math.max(1, nGlass * 2))
      var face = mat.clone()
      face.opacity = Math.max(0.05, a)
      face.depthWrite = false
      var edge = new Mat({ color: 0x8fcfb8, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.78 })
      var spacerM = new Mat({ color: 0x2b2f34, roughness: 0.62, metalness: 0.15 })
      var pvb = new Mat({ color: 0xf4f6f2, roughness: 0.4, transparent: true, opacity: 0.12, depthWrite: false })
      var total = parts.reduce(function (s, x) {
        return s + x.t
      }, 0)
      var z = -total / 2
      var mats = [edge, edge, edge, edge, face, face]
      var sp = 0.0095 // ara çıta görünen yüksekliği
      parts.forEach(function (x) {
        var t = x.t * U,
          zc = (z + x.t / 2) * U
        if (x.glass) {
          var gm = new Mesh(new Box(W, H, t), mats)
          gm.position.set(0, 0, zc)
          gm.renderOrder = 2
          mesh.add(gm)
          if (x.lam) {
            var pv = new Mesh(new Box(W * 0.999, H * 0.999, 0.00076), pvb)
            pv.position.set(0, 0, zc)
            mesh.add(pv)
          }
        } else {
          // ara çıta çerçevesi (kenardan 1 mm içeride, butil dahil)
          var d = t * 0.98,
            ins = 0.001
          ;[
            [W - 2 * ins, sp, 0, H / 2 - ins - sp / 2],
            [W - 2 * ins, sp, 0, -H / 2 + ins + sp / 2],
            [sp, H - 2 * ins - 2 * sp, -W / 2 + ins + sp / 2, 0],
            [sp, H - 2 * ins - 2 * sp, W / 2 - ins - sp / 2, 0],
          ].forEach(function (b) {
            var sm = new Mesh(new Box(b[0], b[1], d), spacerM)
            sm.position.set(b[2], b[3], zc)
            mesh.add(sm)
          })
        }
        z += x.t
      })
      var hidden = mat.clone()
      hidden.visible = false
      mesh.material = hidden
      mesh.userData.ozkLayered = true
    } catch (e) {}
  }

  // Gerçekçi pencere / kapı kolu (rozet + boyun + kavrama); kapalıyken aşağı bakar
  function lever3D(C, T, o) {
    try {
      var M = C.M,
        B = C.B,
        Cy = C.C,
        Sp = C.S,
        G = C.G
      var t = o.t,
        door = o.door,
        hs = o.hs
      var mat = o.mat.clone ? o.mat.clone() : o.mat
      if (mat.roughness != null) mat.roughness = Math.min(mat.roughness, 0.3)
      function cyl(r1, r2, h, seg) {
        return new M(new Cy(r1, r2, h, seg || 24), mat)
      }
      // rozet (yuvarlatılmış dikdörtgen)
      var rw = door ? 0.034 : hs ? 0.036 : 0.029,
        rh = door ? 0.2 : hs ? 0.15 : 0.052,
        rd = 0.011
      var ro = new G()
      ro.position.set(o.r, o.y - (door ? 0.03 : 0), o.k + t * (rd / 2))
      var core = new M(new B(rw, rh, rd), mat)
      ro.add(core)
      ;[rh / 2, -rh / 2].forEach(function (yy) {
        var c = cyl(rw / 2, rw / 2, rd, 28)
        c.rotation.x = Math.PI / 2
        c.position.y = yy
        ro.add(c)
      })
      if (door) {
        var key = new M(new Cy(0.0085, 0.0085, 0.004, 20), new mat.constructor({ color: 0x1d1f22, roughness: 0.5, metalness: 0.6 }))
        key.rotation.x = Math.PI / 2
        key.position.set(0, -0.06, t * (rd / 2 + 0.001))
        ro.add(key)
      }
      T.add(ro)
      // döner kısım
      var w = new G()
      w.position.set(o.r, o.y, o.k + t * rd)
      var collar = cyl(0.0135, 0.0135, 0.004, 28)
      collar.rotation.x = Math.PI / 2
      collar.position.z = t * 0.002
      w.add(collar)
      var neckL = 0.03
      var neck = cyl(0.0092, 0.0102, neckL, 24)
      neck.rotation.x = Math.PI / 2
      neck.position.z = t * (0.004 + neckL / 2)
      w.add(neck)
      var zg = t * (0.004 + neckL)
      var elbow = new M(new Sp(0.0102, 20, 16), mat)
      elbow.position.z = zg
      elbow.castShadow = true
      w.add(elbow)
      var L = door ? 0.135 : hs ? 0.19 : 0.118
      var grip = cyl(0.0098, 0.0082, L, 24)
      var tip = new M(new Sp(0.0082, 20, 16), mat)
      grip.castShadow = true
      if (door) {
        var dir = o.right ? -1 : 1
        grip.rotation.z = Math.PI / 2
        grip.position.set((dir * L) / 2, 0, zg)
        tip.position.set(dir * L, 0, zg)
      } else {
        // aşağı doğru, uca doğru hafif dışa kıvrık
        grip.position.set(0, -L / 2, zg + t * 0.003)
        grip.rotation.x = t * 0.05
        tip.position.set(0, -L, zg + t * 0.0085)
      }
      w.add(grip)
      w.add(tip)
      T.add(w)
      return { group: T, leverPivot: w }
    } catch (e) {
      return null
    }
  }

  // Kanat animasyonu: kol dönüşü, HOK sırası (aktif → levye → pasif), çift açılım vasistas
  var REG = new Set()
  var TILT = { target: 0, cur: 0 }
  function sashInfo(j) {
    var z = j.__ozk
    if (!z) return null
    if (z.role === undefined) {
      z.role = 'single'
      var par = j.pivot.parent
      var list = (par && par.userData.ozkSashes) || []
      if (par) par.userData.ozkSashes = list
      if (list.indexOf(j) < 0) list.push(j)
      list.forEach(function (x) {
        var a = x.__ozk,
          b = list.filter(function (y) {
            return y !== x && y.__ozk.sash.leafId === a.sash.leafId && (y.opening === 'turn' || y.opening === 'tiltturn')
          })[0]
        if (!b || (x.opening !== 'turn' && x.opening !== 'tiltturn')) return
        a.role = a.sash.active ? 'hokActive' : 'hokPassive'
      })
    }
    return z
  }
  function levye(j) {
    var z = j.__ozk
    if (z.levye) return z.levye
    var C = z.C,
      mat = z.hw && z.hw.clone ? z.hw.clone() : z.hw
    var meetX = z.sash.hinge === 'right' ? z.face * 0.5 : z.w - z.face * 0.5
    var zz = z.depth * 0.48
    var base = new C.M(new C.B(0.02, 0.17, 0.004), mat)
    base.position.set(meetX, z.h / 2, zz + 0.002)
    z.inner.add(base)
    var piv = new C.G()
    piv.position.set(meetX, z.h / 2 + 0.07, zz + 0.006)
    var bar = new C.M(new C.B(0.015, 0.13, 0.007), mat)
    bar.position.set(0, -0.065, 0)
    bar.castShadow = true
    piv.add(bar)
    var grip = new C.M(new C.B(0.019, 0.022, 0.011), mat)
    grip.position.set(0, -0.124, 0.002)
    piv.add(grip)
    var ax = new C.M(new C.C(0.005, 0.005, 0.02, 16), mat)
    ax.rotation.z = Math.PI / 2
    piv.add(ax)
    z.inner.add(piv)
    z.levye = piv
    tagPivot(j, z)
    return piv
  }
  // Müşteri 3D dosyası için: kanat hareket bilgisi sahne verisine yazılır (fiyat yok)
  function tagPivot(j, z) {
    try {
      var s = z.sash
      j.pivot.userData.ozk = {
        opening: j.opening,
        hinge: j.hinge,
        openDirection: j.openDirection,
        baseX: j.baseX,
        baseY: j.baseY,
        baseZ: j.baseZ,
        slideDir: j.slideDir,
        slideTravelM: j.slideTravelM,
        role: z.role,
        door: !!s.door,
        right: s.handleSide ? s.handleSide === 'right' : s.hinge === 'left',
        lever: j.leverPivot ? j.leverPivot.uuid : null,
        levye: z.levye ? z.levye.uuid : null,
      }
    } catch (e) {}
  }
  function anim3D(j, O, orig) {
    try {
      j.__lastO = O
      j.__orig = orig
      var z = sashInfo(j)
      if (!z) return orig(j, O)
      REG.add(j)
      tagPivot(j, z)
      var op = j.opening
      if (op !== 'turn' && op !== 'tiltturn') return orig(j, O)
      var s = z.sash
      var right = s.handleSide ? s.handleSide === 'right' : s.hinge === 'left'
      if (z.role === 'hokPassive') {
        var lv = ease((O - 0.6) / 0.12)
        levye(j).rotation.x = -lv * Math.PI * 0.55
        j.pivot.rotation.x = 0
        return orig(j, ease((O - 0.72) / 0.28))
      }
      var p = z.role === 'hokActive' ? ease((O - 0.08) / 0.5) : ease((O - 0.08) / 0.92)
      var tilt = op === 'tiltturn' ? TILT.cur : 0
      var hp = j.leverPivot
      if (tilt > 0.001 && O < 0.001) {
        j.pivot.rotation.y = 0
        var I = j.openDirection === 'outward' ? -1 : 1
        j.pivot.rotation.x = I * ease((tilt - 0.08) / 0.92) * (Math.PI / 9)
        if (hp && !s.door) hp.rotation.z = Math.PI * ease(tilt / 0.12)
        return
      }
      j.pivot.rotation.x = 0
      orig(j, p)
      if (hp) {
        if (s.door) {
          var dir = right ? -1 : 1
          hp.rotation.z = -dir * 0.6 * Math.sin(Math.PI * clamp01(O / 0.2))
        } else hp.rotation.z = (right ? -1 : 1) * (Math.PI / 2) * ease(O / 0.1)
      }
    } catch (e) {
      return orig(j, O)
    }
  }
  function tiltLoop() {
    var d = TILT.target - TILT.cur
    if (Math.abs(d) > 0.0008) {
      TILT.cur += d * 0.14
      if (Math.abs(TILT.target - TILT.cur) <= 0.0008) TILT.cur = TILT.target
      REG.forEach(function (j) {
        if (!j.pivot || !j.pivot.parent) return REG.delete(j)
        if (j.opening === 'tiltturn' && j.__orig) anim3D(j, j.__lastO || 0, j.__orig)
      })
    }
    requestAnimationFrame(tiltLoop)
  }
  requestAnimationFrame(tiltLoop)
  // 3D görünüme "Vasistas" kaydırma çubuğu (çift açılımlı kanatlar)
  function tiltUI() {
    try {
      var has = false
      REG.forEach(function (j) {
        if (j.opening === 'tiltturn' && j.pivot && j.pivot.parent) has = true
      })
      document.querySelectorAll('canvas[data-engine^="three"]').forEach(function (cv) {
        var box = cv.parentElement
        if (!box) return
        var ui = box.querySelector(':scope > .ozk-tilt')
        if (!has) {
          if (ui) ui.style.display = 'none'
          return
        }
        if (!ui) {
          if (getComputedStyle(box).position === 'static') box.style.position = 'relative'
          ui = document.createElement('label')
          ui.className = 'ozk-tilt'
          ui.title = 'Çift açılımlı kanatları vasistas (devirme) konumuna getirir. Kanat açıkken önce kanadı kapatın.'
          ui.innerHTML = '<span>⤓ Vasistas</span><input type="range" min="0" max="100" step="1"><b>0%</b>'
          var inp = ui.querySelector('input'),
            lab = ui.querySelector('b')
          inp.addEventListener('input', function () {
            TILT.target = inp.value / 100
            lab.textContent = inp.value + '%'
            document.querySelectorAll('.ozk-tilt input').forEach(function (x) {
              if (x !== inp) {
                x.value = inp.value
                x.parentNode.querySelector('b').textContent = inp.value + '%'
              }
            })
          })
          ;['pointerdown', 'wheel', 'mousedown', 'touchstart'].forEach(function (ev) {
            ui.addEventListener(ev, function (e) {
              e.stopPropagation()
            })
          })
          box.appendChild(ui)
        }
        ui.style.display = ''
        ui.querySelector('input').value = Math.round(TILT.target * 100)
        ui.querySelector('b').textContent = Math.round(TILT.target * 100) + '%'
      })
    } catch (e) {}
  }

  var SCENES = []
  function envTexture(CT) {
    var c = document.createElement('canvas')
    c.width = 512
    c.height = 256
    var x = c.getContext('2d')
    var g = x.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#9cc7ec')
    g.addColorStop(0.42, '#e8f1f8')
    g.addColorStop(0.5, '#ffffff')
    g.addColorStop(0.56, '#c9c3b6')
    g.addColorStop(1, '#6f6a62')
    x.fillStyle = g
    x.fillRect(0, 0, 512, 256)
    // pencere ışığı (yumuşak parlak alanlar)
    x.fillStyle = 'rgba(255,255,255,0.85)'
    x.fillRect(60, 40, 90, 70)
    x.fillRect(330, 50, 120, 60)
    var t = new CT(c)
    t.mapping = 303 // EquirectangularReflectionMapping
    t.colorSpace = 'srgb'
    t.needsUpdate = true
    return t
  }
  function sceneBg() {
    return document.documentElement.getAttribute('data-ozk-theme') === 'day' ? 0xe7ebef : 0x0d121a
  }
  var LIVE3D = { group: null, pos: null, t: 0 }
  function fix3D(group, CT, scene, pos) {
    try {
      if (group && pos) {
        LIVE3D.group = group
        LIVE3D.pos = pos
        LIVE3D.t = Date.now()
      }
      if (scene) {
        if (!scene.environment && CT) scene.environment = envTexture(CT)
        if (scene.background && scene.background.setHex) scene.background.setHex(sceneBg())
        if (SCENES.indexOf(scene) < 0) SCENES.push(scene)
      }
      if (!group || !group.traverse) return
      group.traverse(function (o) {
        var m = o.material
        if (!o.isMesh || !m || Array.isArray(m) || !m.userData || !m.userData.ozkTex || !m.map) return
        var p = o.geometry && o.geometry.parameters
        if (!p || !p.width || !p.height) return
        var horiz = p.width > p.height
        var len = horiz ? p.width : p.height
        var mm = m.clone()
        mm.map = m.map.clone()
        mm.map.needsUpdate = true
        mm.map.center && mm.map.center.set(0.5, 0.5)
        mm.map.rotation = horiz ? Math.PI / 2 : 0
        var rep = Math.max(1, len / 0.55)
        if (mm.map.repeat) horiz ? mm.map.repeat.set(rep, 1) : mm.map.repeat.set(1, rep)
        mm.userData = { ozkTexClone: true }
        o.material = mm
      })
      setTimeout(tiltUI, 60)
    } catch (e) {}
  }

  /* ------------------------------------------------ kullanıcı profilleri */
  // ERP'ye geçince giriş yapan kullanıcıdan gelecek; şimdilik bu bilgisayarda seçilir.
  var UKEY = 'ozk.users',
    AKEY = 'ozk.activeUser'
  var DEFAULT_USERS = [
    { id: 'tarik', name: 'Tarık Buğra', phone: '', email: '' },
    { id: 'furkan', name: 'Furkan', phone: '', email: '' },
    { id: 'volkan', name: 'Volkan', phone: '', email: '' },
  ]
  function users() {
    try {
      var u = JSON.parse(localStorage.getItem(UKEY) || 'null')
      return Array.isArray(u) && u.length ? u : DEFAULT_USERS.slice()
    } catch (e) {
      return DEFAULT_USERS.slice()
    }
  }
  function saveUsers(list) {
    setPref(UKEY, JSON.stringify(list))
  }
  function activeUser() {
    var list = users()
    var id = getPref(AKEY, list[0].id)
    return list.filter(function (u) {
      return u.id === id
    })[0] || list[0]
  }
  function userName() {
    return activeUser().name
  }
  var PLACEHOLDER_DRAWN = /^(abt cad|özkanoğlu cad|ozkanoglu cad|abt)?$/i
  function fixDrawn(v) {
    v = String(v || '').trim()
    return PLACEHOLDER_DRAWN.test(v) ? userName() : v
  }
  // Teklifte "Çizen / Teklif veren": ad soyad + telefon
  function drawnByLabel(v) {
    var name = fixDrawn(v)
    var u = users().filter(function (x) {
      return x.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr')
    })[0]
    var extra = u ? [u.phone, u.email].filter(Boolean).join(' · ') : ''
    return extra ? name + ' · ' + extra : name
  }

  /* -------------------------------------------- Vinesso imzası (by Özkanoğlu) */
  function vinessoLockup(n, src, mark) {
    return n.jsxs('span', {
      className: 'ozk-vin',
      children: [
        n.jsx('img', { src: src, alt: 'VINESSO', className: 'ozk-vin-logo' }, 'v'),
        n.jsxs(
          'span',
          {
            className: 'ozk-vin-by',
            children: [
              n.jsx('i', { children: 'by' }, 'b'),
              mark ? n.jsx('img', { src: mark, alt: '', className: 'ozk-vin-mark' }, 'm') : null,
              n.jsx('b', { children: 'ÖZKANOĞLU' }, 'o'),
            ],
          },
          'by',
        ),
      ],
    })
  }

  /* ------------------------------------------------ kayıtlı veri: adres */
  ;(function migrateAddress() {
    try {
      var k = 'ozkanoglu_pencad60_settings'
      var raw = localStorage.getItem(k)
      if (!raw) return
      var st = JSON.parse(raw)
      if (st && st.company && /Yapraklı Bulvarı/.test(st.company.address || '')) {
        st.company.address = NEW_ADDRESS
        localStorage.setItem(k, JSON.stringify(st))
      }
    } catch (e) {}
  })()

  /* ------------------------------------------------------ tema & göz koruma */
  var TKEY = 'ozk.ui.theme',
    EKEY = 'ozk.ui.eye'
  function getPref(k, d) {
    try {
      return localStorage.getItem(k) || d
    } catch (e) {
      return d
    }
  }
  function setPref(k, v) {
    try {
      localStorage.setItem(k, v)
    } catch (e) {}
  }
  function resolveTheme(pref) {
    if (pref === 'day' || pref === 'night') return pref
    var h = new Date().getHours()
    return h >= 7 && h < 19 ? 'day' : 'night'
  }
  function applyTheme() {
    var pref = getPref(TKEY, 'auto')
    var th = resolveTheme(pref)
    var root = document.documentElement
    root.setAttribute('data-ozk-theme', th)
    root.setAttribute('data-ozk-eye', getPref(EKEY, '1'))
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', th === 'day' ? '#f2f0eb' : '#0a0d12')
    SCENES.forEach(function (s) {
      try {
        s.background && s.background.setHex && s.background.setHex(sceneBg())
      } catch (e) {}
    })
    var ui = document.getElementById('ozk-theme-ui')
    if (ui) {
      ui.querySelectorAll('[data-v]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-v') === pref ? 'true' : 'false')
      })
      var eb = ui.querySelector('[data-eye]')
      if (eb) eb.setAttribute('aria-pressed', getPref(EKEY, '1') === '1' ? 'true' : 'false')
    }
  }

  /* ============================================= PREMİUM TEKLİF (6.2) */
  var QT = {
    TR: { inst: 'Montaj', incl: 'Fiyata dahildir', excl: 'Fiyata dahil değildir', vat: 'Alıcı ülke KDV’si (VAT)', spec: 'Kullanılan Profil Sistemleri & Ürün Detayları', depth: 'Profil derinliği', ch: 'Odacık', seal: 'Conta sistemi', gr: 'Cam kapasitesi', cls: 'Profil sınıfı', hw: 'Donanım', glass: 'Kullanılan Camlar', thick: 'Kalınlık', g: 'g değeri', lt: 'Işık geçirgenliği', rw: 'Ses yalıtımı', pos: 'Poz', brand: 'Marka' },
    EN: { inst: 'Installation', incl: 'Included in the price', excl: 'Not included in the price', vat: 'Buyer country VAT', spec: 'Profile Systems & Product Details', depth: 'Profile depth', ch: 'Chambers', seal: 'Gasket system', gr: 'Glazing range', cls: 'Profile class', hw: 'Hardware', glass: 'Glazing Used', thick: 'Thickness', g: 'g-value', lt: 'Light transmittance', rw: 'Sound insulation', pos: 'Pos.', brand: 'Brand' },
    DE: { inst: 'Montage', incl: 'Im Preis enthalten', excl: 'Nicht im Preis enthalten', vat: 'Mehrwertsteuer des Käuferlandes', spec: 'Profilsysteme & Produktdetails', depth: 'Bautiefe', ch: 'Kammern', seal: 'Dichtungssystem', gr: 'Glasstärken', cls: 'Profilklasse', hw: 'Beschlag', glass: 'Verwendete Verglasungen', thick: 'Dicke', g: 'g-Wert', lt: 'Lichtdurchlässigkeit', rw: 'Schalldämmung', pos: 'Pos.', brand: 'Marke' },
    NL: { inst: 'Montage', incl: 'Inbegrepen in de prijs', excl: 'Niet inbegrepen in de prijs', vat: 'Btw van het land van de koper', spec: 'Profielsystemen & productdetails', depth: 'Bouwdiepte', ch: 'Kamers', seal: 'Dichtingssysteem', gr: 'Glasdiktes', cls: 'Profielklasse', hw: 'Beslag', glass: 'Gebruikte beglazing', thick: 'Dikte', g: 'g-waarde', lt: 'Lichttoetreding', rw: 'Geluidsisolatie', pos: 'Pos.', brand: 'Merk' },
    FR: { inst: 'Pose / installation', incl: 'Inclus dans le prix', excl: 'Non inclus dans le prix', vat: 'TVA du pays de l’acheteur', spec: 'Systèmes de profilés & détails produit', depth: 'Profondeur', ch: 'Chambres', seal: 'Système de joints', gr: 'Épaisseurs de vitrage', cls: 'Classe de profilé', hw: 'Quincaillerie', glass: 'Vitrages utilisés', thick: 'Épaisseur', g: 'Facteur g', lt: 'Transmission lumineuse', rw: 'Isolation acoustique', pos: 'Pos.', brand: 'Marque' },
    IT: { inst: 'Posa in opera', incl: 'Incluso nel prezzo', excl: 'Non incluso nel prezzo', vat: 'IVA del paese dell’acquirente', spec: 'Sistemi di profili & dettagli prodotto', depth: 'Profondità', ch: 'Camere', seal: 'Sistema guarnizioni', gr: 'Spessori vetro', cls: 'Classe profilo', hw: 'Ferramenta', glass: 'Vetri utilizzati', thick: 'Spessore', g: 'Fattore g', lt: 'Trasmissione luminosa', rw: 'Isolamento acustico', pos: 'Pos.', brand: 'Marca' },
    RU: { inst: 'Монтаж', incl: 'Включено в цену', excl: 'Не включено в цену', vat: 'НДС страны покупателя', spec: 'Профильные системы и детали изделий', depth: 'Монтажная глубина', ch: 'Камеры', seal: 'Система уплотнения', gr: 'Толщина остекления', cls: 'Класс профиля', hw: 'Фурнитура', glass: 'Используемое остекление', thick: 'Толщина', g: 'Коэфф. g', lt: 'Светопропускание', rw: 'Звукоизоляция', pos: 'Поз.', brand: 'Бренд' },
    AR: { inst: 'التركيب', incl: 'مشمول في السعر', excl: 'غير مشمول في السعر', vat: 'ضريبة القيمة المضافة في بلد المشتري', spec: 'أنظمة البروفيل وتفاصيل المنتج', depth: 'عمق البروفيل', ch: 'الحجرات', seal: 'نظام الجوانات', gr: 'سماكات الزجاج', cls: 'فئة البروفيل', hw: 'الإكسسوارات', glass: 'الزجاج المستخدم', thick: 'السماكة', g: 'معامل g', lt: 'نفاذية الضوء', rw: 'العزل الصوتي', pos: 'بند', brand: 'العلامة' },
  }
  function qt(lang) {
    return QT[String(lang || 'TR').toUpperCase()] || QT.EN
  }
  var AKEY_ANTET = 'ozk.ui.antet'
  function antetOn() {
    return getPref(AKEY_ANTET, '1') === '1' && !!ASSETS.antet
  }
  function quoteVisible() {
    var q = document.querySelector('.print-sheet:not(.print-only)')
    return !!(q && q.offsetParent !== null)
  }
  function applyAntet(forPrint) {
    try {
      var on = antetOn()
      document.documentElement.setAttribute('data-ozk-antet', on ? '1' : '0')
      if (ASSETS.antet_ust) {
        document.documentElement.style.setProperty('--ozk-antet-top', 'url(' + ASSETS.antet_ust + ')')
        document.documentElement.style.setProperty('--ozk-antet-bottom', 'url(' + ASSETS.antet_alt + ')')
      }
      var st = document.getElementById('ozk-antet-print')
      if (!st && ASSETS.antet) {
        st = document.createElement('style')
        st.id = 'ozk-antet-print'
        // @page arka planı her basılı sayfada tekrar eder; konum içerik alanına göre (kenar boşluğu kadar geri)
        st.textContent =
          '@page{size:A4 portrait;margin:31mm 12mm 53mm 12mm !important;background:url(' + ASSETS.antet + ') -12mm -31mm/210mm 297mm no-repeat}' +
          'html,body,#root,#root *:has(.print-sheet),.print-sheet{background:transparent!important}.print-sheet:not(.print-only){zoom:.9}'
      }
      // en sona taşı: uygulamanın kendi @page kuralından sonra gelmeli
      if (st && document.body && st.parentNode !== document.body) document.body.appendChild(st)
      else if (st && !st.parentNode) document.head.appendChild(st)
      // Antet sadece müşteri teklifi basılırken (kesim listesi vb. baskılarda değil)
      if (st) st.media = on && (forPrint ? quoteVisible() : true) ? 'print' : 'not all'
    } catch (e) {}
  }
  window.addEventListener('beforeprint', function () {
    applyAntet(true)
  })
  window.addEventListener('afterprint', function () {
    applyAntet()
  })
  function setAntet(on) {
    setPref(AKEY_ANTET, on ? '1' : '0')
    applyAntet()
  }

  // Ticari şartlar paneli: Montaj + Antet (Nakliye/Palet kutularıyla aynı görünüm)
  function montajUI(n, c, b, g, e, ctx) {
    try {
      var on = !!c.includeInstallation
      return n.jsxs('div', {
        className: 'rounded-lg border border-ink-800 bg-ink-900/80 p-2 space-y-1.5',
        children: [
          n.jsxs('label', {
            className: 'flex cursor-pointer items-center justify-between',
            children: [
              n.jsxs('span', {
                className: 'flex items-center gap-1.5 font-semibold text-white',
                children: [
                  n.jsx('input', {
                    type: 'checkbox',
                    checked: on,
                    onChange: function (ev) {
                      b({ includeInstallation: ev.target.checked })
                    },
                    className: 'h-4 w-4 rounded accent-brand-500',
                  }),
                  n.jsx('span', { children: '🔧' }),
                  n.jsx('span', { children: 'Montaj Bedeli' }),
                ],
              }),
              n.jsx('span', { className: 'font-mono text-[11px] font-bold text-gold-400', children: g(e.installation || 0) }),
            ],
          }),
          on &&
            n.jsx('input', {
              type: 'number',
              min: 0,
              placeholder: 'Montaj tutarı (teklif para birimi)',
              value: c.installationPrice == null ? '' : c.installationPrice,
              onChange: function (ev) {
                var v = ev.target.value
                b({ installationPrice: v === '' ? null : Math.max(0, parseFloat(v) || 0) })
              },
              className: 'h-7 w-full rounded border border-ink-700 bg-ink-950 px-2 font-mono text-[11px] text-white',
            }),
          n.jsx('div', {
            className: 'text-[10px] leading-snug text-ink-400',
            children: 'Tikli kalemler teklifte “dahildir”, tiksizler “dahil değildir” olarak yazılır. Alıcı ülke KDV’si hiçbir zaman dahil değildir.',
          }),
          n.jsxs('label', {
            className: 'flex cursor-pointer items-center gap-1.5 border-t border-ink-800 pt-1.5 font-semibold text-white',
            children: [
              n.jsx('input', {
                type: 'checkbox',
                defaultChecked: antetOn(),
                onChange: function (ev) {
                  setAntet(ev.target.checked)
                },
                className: 'h-4 w-4 rounded accent-brand-500',
              }),
              n.jsx('span', { children: '📄 Antetli kâğıt (PDF / baskı arka planı)' }),
            ],
          }),
          ctx ? issueButton(n, Object.assign({ totals: e, fmt: g }, ctx)) : null,
          ctx ? customer3DButton(n, Object.assign({ totals: e }, ctx)) : null,
        ],
      })
    } catch (err) {
      return null
    }
  }

  // Özet kutusu: montaj satırı
  function montajLine(n, c, e, g, lang) {
    if (!c.includeInstallation || !(e.installation > 0)) return null
    return n.jsxs('div', {
      className: 'flex justify-between text-slate-600',
      children: [n.jsxs('span', { children: [qt(lang).inst, ':'] }), n.jsx('strong', { children: g(e.installation) })],
    })
  }

  // Ticari şartlar listesinin sonuna: dahil / dahil değil
  function terms(list, c, h) {
    try {
      var T = qt(c.language)
      var inc = [],
        exc = []
      ;[
        [c.includePackaging, h.packaging],
        [c.includePallet, h.pallet],
        [c.includeFreight, h.freight],
        [c.includeInstallation && c.installationPrice > 0, T.inst],
      ].forEach(function (x) {
        if (!x[1]) return
        ;(x[0] ? inc : exc).push(x[1])
      })
      // İhracat kuralı: alıcı ülke KDV'si asla dahil değil (yurt içi KDV'li tekliflerde yazılmaz)
      if (!(c.vatPercent > 0)) exc.push(T.vat)
      var instIn = c.includeInstallation && c.installationPrice > 0
      // Montaj dahilse Furkan'ın "montaj hariçtir" maddesi çelişmesin diye çıkarılır
      var out = list.filter(function (t) {
        return !(instIn && /montaj|installation|montage|التركيب/i.test(String(t)))
      })
      if (inc.length) out.push(T.incl + ': ' + inc.join(', ') + '.')
      if (exc.length) out.push(T.excl + ': ' + exc.join(', ') + '.')
      return out
    } catch (e) {
      return list
    }
  }

  // Teklif altı: kullanılan profil sistemleri (kesit görseli + teknik) ve cam özeti — fiyat yok
  function specSection(n, project, cat, c, totals) {
    try {
      var lang = c.language,
        T = qt(lang),
        isTR = String(lang || 'TR').toUpperCase() === 'TR'
      var sKeys = [],
        gKeys = []
      function add(arr, k) {
        if (k && arr.indexOf(k) < 0) arr.push(k)
      }
      ;(project.positions || []).forEach(function (p) {
        add(sKeys, p.series)
        add(gKeys, p.glass)
        ;(p.coupledUnits || []).forEach(function (u) {
          add(sKeys, u.series || (u.unitPos && u.unitPos.series))
          add(gKeys, u.glass || (u.unitPos && u.unitPos.glass))
        })
      })
      ;((totals && totals.lines) || []).forEach(function (l) {
        ;(l.glass || []).forEach(function (x) {
          add(gKeys, x && (x.code || x.glassKey))
        })
      })
      var series = sKeys
        .map(function (k) {
          return cat.series && cat.series[k]
        })
        .filter(Boolean)
      var glasses = gKeys
        .map(function (k) {
          return cat.glasses && cat.glasses[k]
        })
        .filter(Boolean)
      if (!series.length && !glasses.length) return null
      function row(k, v) {
        return v === undefined || v === null || v === ''
          ? null
          : n.jsxs('div', { className: 'ozk-spec-row', children: [n.jsx('span', { children: k }), n.jsx('b', { children: v })] }, k)
      }
      var cards = series.map(function (s) {
        var img = ASSETS['prof_' + s.key]
        return n.jsxs(
          'div',
          {
            className: 'ozk-spec-card',
            children: [
              img ? n.jsx('img', { src: img, alt: s.name, className: 'ozk-spec-img' }) : null,
              n.jsxs('div', {
                className: 'ozk-spec-body',
                children: [
                  n.jsx('div', { className: 'ozk-spec-brand', children: s.brand || '' }),
                  n.jsx('div', { className: 'ozk-spec-name', children: s.name }),
                  row(T.depth, s.thickness ? s.thickness + ' mm' : ''),
                  row(T.ch, s.chambers),
                  row('Uf', s.uf ? s.uf + ' W/m²K' : ''),
                  row(T.gr, s.glassRange),
                  row(T.cls, s.profileClass),
                  isTR ? row(T.seal, s.sealSystem) : null,
                  row(T.hw, s.hardwareBrand),
                ],
              }),
            ],
          },
          s.key,
        )
      })
      var gRows = glasses.map(function (g) {
        return n.jsxs(
          'tr',
          {
            children: [
              n.jsx('td', { children: gName(g, lang) }),
              n.jsx('td', { children: g.ug != null ? g.ug : '–' }),
              n.jsx('td', { children: g.thicknessMm ? g.thicknessMm + ' mm' : '–' }),
              n.jsx('td', { children: g.solarFactor ? '%' + g.solarFactor : '–' }),
              n.jsx('td', { children: g.lightTransmittance ? '%' + g.lightTransmittance : '–' }),
              n.jsx('td', { children: g.rwDb ? g.rwDb + ' dB' : '–' }),
            ],
          },
          g.key,
        )
      })
      return n.jsxs('div', {
        className: 'ozk-spec print-avoid-break',
        children: [
          n.jsx('h4', { className: 'ozk-spec-title', children: T.spec }),
          cards.length ? n.jsx('div', { className: 'ozk-spec-grid', children: cards }) : null,
          gRows.length
            ? n.jsxs('table', {
                className: 'ozk-spec-glass',
                children: [
                  n.jsx('thead', {
                    children: n.jsxs('tr', {
                      children: [T.glass, 'Ug (W/m²K)', T.thick, T.g, T.lt, T.rw].map(function (x) {
                        return n.jsx('th', { children: x }, x)
                      }),
                    }),
                  }),
                  n.jsx('tbody', { children: gRows }),
                ],
              })
            : null,
        ],
      })
    } catch (err) {
      return null
    }
  }


  /* ============================================= VERİLEN TEKLİFLER KAYDI (6.2) */
  // Furkan'ın arşivinden ayrı: teklif verildiği andaki birim fiyatlar + toplamlar + proje kopyası
  var IKEY = 'ozk.issuedQuotes'
  function issuedList() {
    try {
      var a = JSON.parse(localStorage.getItem(IKEY) || '[]')
      return Array.isArray(a) ? a : []
    } catch (e) {
      return []
    }
  }
  function issuedSave(a) {
    try {
      localStorage.setItem(IKEY, JSON.stringify(a))
      return true
    } catch (e) {
      toast('Kayıt alanı doldu: eski teklifleri JSON olarak indirip silin')
      return false
    }
  }
  function nm(o) {
    return (o && (o.name || o.shortName)) || ''
  }
  function issueQuote(ctx) {
    var pr = ctx.project,
      cat = ctx.catalog,
      tot = ctx.totals,
      c = pr.commercial || {}
    var lines = (tot && tot.lines) || []
    if (!lines.length) return toast('Teklifte poz yok')
    var noPrice = lines.filter(function (l) {
      return !(l.priceUnit > 0)
    })
    if (noPrice.length) {
      return toast(
        'Birim fiyatı olmayan poz var: ' +
          noPrice
            .map(function (l) {
              return (l.pos && (l.pozCode || l.pos.pozCode || l.pos.title)) || '?'
            })
            .join(', ') +
          ' — teklif kayda alınmadı',
      )
    }
    var list = issuedList()
    var rev = list.filter(function (q) {
      return q.quoteNo === pr.quoteNo
    }).length
    var rate = (cat.exchangeRates && cat.exchangeRates[c.currency]) || 1
    var rec = {
      id: 'iq_' + Date.now().toString(36),
      issuedAt: new Date().toISOString(),
      quoteNo: pr.quoteNo || '',
      rev: rev,
      projectName: pr.projectName || '',
      customer: JSON.parse(JSON.stringify(pr.customer || {})),
      drawnBy: fixDrawn(pr.drawnBy),
      issuedBy: userName(),
      currency: c.currency || 'EUR',
      rate: rate,
      language: c.language || 'TR',
      incoterm: [c.incoterm, c.incotermPlace].filter(Boolean).join(' — '),
      includes: {
        packaging: !!c.includePackaging,
        pallet: !!c.includePallet,
        freight: !!c.includeFreight,
        installation: !!c.includeInstallation,
      },
      totals: {
        products: tot.products,
        packaging: tot.packaging,
        pallet: tot.pallet,
        freight: tot.freight,
        installation: tot.installation || 0,
        subtotal: tot.subtotal,
        discount: tot.discount,
        net: tot.net,
        vat: tot.vat,
        grand: tot.grand,
        totalArea: tot.totalArea,
        totalUnits: tot.totalUnits,
        totalWeightKg: tot.totalWeightKg,
      },
      grandText: ctx.fmt ? ctx.fmt(tot.grand) : '',
      lines: lines.map(function (l, i) {
        var p = l.pos || {}
        return {
          poz: p.pozCode || 'POZ ' + (i + 1),
          title: p.title || '',
          qty: Math.max(1, Math.round(p.qty) || 1),
          w: p.totalW || (l.geo && l.geo.W_total) || '',
          h: p.totalH || (l.geo && l.geo.H_total) || '',
          series: nm(cat.series && cat.series[p.series]),
          glass: nm(cat.glasses && cat.glasses[p.glass]),
          color: nm(cat.colors && cat.colors[p.color]),
          unit: l.priceUnit,
          unitText: ctx.fmt ? ctx.fmt(l.priceUnit) : '',
          line: l.priceLine,
          lineText: ctx.fmt ? ctx.fmt(l.priceLine) : '',
        }
      }),
      project: JSON.parse(JSON.stringify(pr)),
    }
    list.unshift(rec)
    if (issuedSave(list)) {
      toast('#' + rec.quoteNo + (rev ? ' (Rev.' + rev + ')' : '') + ' verilen teklifler kaydına alındı · ' + rec.grandText)
      try {
        window.dispatchEvent(new Event('ozk-issued'))
      } catch (e) {}
    }
  }
  function downloadJSON(name, data) {
    var a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    a.download = name
    document.body.appendChild(a)
    a.click()
    setTimeout(function () {
      URL.revokeObjectURL(a.href)
      a.remove()
    }, 500)
  }
  function issueButton(n, ctx) {
    return n.jsx('button', {
      type: 'button',
      onClick: function () {
        issueQuote(ctx)
      },
      className: 'mt-1 w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500',
      children: '✔ Teklif Verildi — Kayda Al (birim fiyatlarla)',
    })
  }
  // Projeler sekmesi: Verilen Teklifler paneli (React bileşeni; React örneği props.R ile gelir)
  function IssuedPanel(props) {
    var n = props.n,
      R = props.R
    var st = R.useState(0),
      bump = st[1]
    var op = R.useState(null),
      open = op[0],
      setOpen = op[1]
    var qs = R.useState(''),
      q = qs[0],
      setQ = qs[1]
    R.useEffect(function () {
      function f() {
        bump(function (x) {
          return x + 1
        })
      }
      window.addEventListener('ozk-issued', f)
      return function () {
        window.removeEventListener('ozk-issued', f)
      }
    }, [])
    var all = issuedList()
    var ql = q.toLocaleLowerCase('tr')
    var list = all.filter(function (x) {
      if (!ql) return true
      return [x.quoteNo, x.projectName, x.customer && x.customer.company, x.customer && x.customer.name, x.customer && x.customer.country, x.issuedBy]
        .join(' ')
        .toLocaleLowerCase('tr')
        .indexOf(ql) >= 0
    })
    function del(id) {
      if (!confirm('Bu verilen teklif kaydı silinsin mi?')) return
      issuedSave(
        issuedList().filter(function (x) {
          return x.id !== id
        }),
      )
      bump(function (x) {
        return x + 1
      })
    }
    var rows = list.map(function (x) {
      var d = new Date(x.issuedAt)
      var isOpen = open === x.id
      return n.jsxs(
        'div',
        {
          className: 'rounded-xl border border-ink-800 bg-ink-950 p-3',
          children: [
            n.jsxs('div', {
              className: 'flex items-center justify-between gap-2',
              children: [
                n.jsxs('div', {
                  className: 'min-w-0',
                  children: [
                    n.jsx('div', {
                      className: 'truncate font-bold text-white',
                      children: '#' + x.quoteNo + (x.rev ? ' · Rev.' + x.rev : '') + ' — ' + (x.projectName || ''),
                    }),
                    n.jsx('div', {
                      className: 'truncate text-[10px] text-ink-400',
                      children: [
                        (x.customer && (x.customer.company || x.customer.name)) || '',
                        x.customer && x.customer.country,
                        d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                        'Veren: ' + (x.issuedBy || x.drawnBy || ''),
                        x.lines.length + ' poz',
                        x.incoterm,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    }),
                  ],
                }),
                n.jsxs('div', {
                  className: 'flex shrink-0 items-center gap-1.5',
                  children: [
                    n.jsx('span', { className: 'font-mono text-[12px] font-bold text-gold-400', children: x.grandText }),
                    n.jsx('button', {
                      type: 'button',
                      onClick: function () {
                        setOpen(isOpen ? null : x.id)
                      },
                      className: 'rounded-lg bg-ink-800 px-2.5 py-1 font-semibold text-ink-200 hover:bg-ink-700',
                      children: isOpen ? 'Kapat' : 'Detay',
                    }),
                    n.jsx('button', {
                      type: 'button',
                      onClick: function () {
                        if (!confirm('#' + x.quoteNo + ' teklifindeki proje açılsın mı? (Açık çalışma dosyası bununla değişir)')) return
                        props.load(JSON.parse(JSON.stringify(x.project)))
                        props.notify && props.notify('#' + x.quoteNo + ' verilen tekliften açıldı', 'ok')
                      },
                      className: 'rounded-lg bg-brand-600 px-2.5 py-1 font-semibold text-white hover:bg-brand-500',
                      children: 'Aç',
                    }),
                    n.jsx('button', {
                      type: 'button',
                      onClick: function () {
                        del(x.id)
                      },
                      className: 'rounded-lg bg-ink-800 px-2 py-1 text-red-300 hover:bg-red-900/40',
                      children: '✕',
                    }),
                  ],
                }),
              ],
            }),
            isOpen &&
              n.jsxs('table', {
                className: 'mt-2 w-full text-[10.5px]',
                children: [
                  n.jsx('thead', {
                    children: n.jsx('tr', {
                      className: 'text-left text-ink-400',
                      children: ['Poz', 'Açıklama', 'Ölçü', 'Adet', 'Seri / Cam / Renk', 'Birim Fiyat', 'Tutar'].map(function (h) {
                        return n.jsx('th', { className: 'py-1 pe-2 font-semibold', children: h }, h)
                      }),
                    }),
                  }),
                  n.jsx('tbody', {
                    children: x.lines.map(function (l, i) {
                      return n.jsx(
                        'tr',
                        {
                          className: 'border-t border-ink-800 text-ink-200',
                          children: [
                            l.poz,
                            l.title,
                            l.w + ' × ' + l.h,
                            l.qty,
                            [l.series, l.glass, l.color].filter(Boolean).join(' · '),
                            l.unitText,
                            l.lineText,
                          ].map(function (v, j) {
                            return n.jsx('td', { className: 'py-1 pe-2' + (j >= 5 ? ' whitespace-nowrap font-mono text-gold-400' : j === 2 || j === 0 ? ' whitespace-nowrap' : ''), children: v }, j)
                          }),
                        },
                        i,
                      )
                    }),
                  }),
                ],
              }),
          ],
        },
        x.id,
      )
    })
    return n.jsxs('div', {
      className: 'rounded-2xl border border-emerald-500/30 bg-ink-900/60 p-4 space-y-3',
      children: [
        n.jsxs('div', {
          className: 'flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 pb-2',
          children: [
            n.jsx('span', { className: 'font-bold text-emerald-300', children: '✔ Verilen Teklifler (' + all.length + ')' }),
            n.jsxs('div', {
              className: 'flex items-center gap-1.5',
              children: [
                n.jsx('input', {
                  value: q,
                  onChange: function (ev) {
                    setQ(ev.target.value)
                  },
                  placeholder: 'Ara: müşteri, ülke, teklif no…',
                  className: 'h-7 w-48 rounded border border-ink-700 bg-ink-950 px-2 text-[11px] text-white',
                }),
                n.jsx('button', {
                  type: 'button',
                  onClick: function () {
                    downloadJSON('verilen-teklifler-' + new Date().toISOString().slice(0, 10) + '.json', issuedList())
                  },
                  className: 'rounded-lg border border-ink-700 bg-ink-900 px-3 py-1 font-semibold text-ink-200 hover:bg-ink-800',
                  children: '⬇ JSON',
                }),
              ],
            }),
          ],
        }),
        rows.length
          ? n.jsx('div', { className: 'space-y-2', children: rows })
          : n.jsx('div', {
              className: 'py-3 text-center italic text-ink-500',
              children: 'Henüz kayıt yok. Müşteri Teklifi sekmesinde “✔ Teklif Verildi — Kayda Al” düğmesiyle eklenir; teklif anındaki birim fiyatlar ve toplamlar saklanır.',
            }),
      ],
    })
  }
  function issuedPanel(n, R, props) {
    try {
      return n.jsx(IssuedPanel, Object.assign({ n: n, R: R }, props))
    } catch (e) {
      return null
    }
  }


  /* ============================================= FAVORİLER (6.2) */
  // ozk.fav.<tür> = [anahtar, ...]  — favoriler listelerin en üstüne çıkar
  function favList(kind) {
    try {
      var a = JSON.parse(localStorage.getItem('ozk.fav.' + kind) || '[]')
      return Array.isArray(a) ? a : []
    } catch (e) {
      return []
    }
  }
  function isFav(kind, key) {
    return favList(kind).indexOf(key) >= 0
  }
  function toggleFav(kind, key) {
    if (!key) return
    var a = favList(kind),
      i = a.indexOf(key)
    if (i >= 0) a.splice(i, 1)
    else a.unshift(key)
    setPref('ozk.fav.' + kind, JSON.stringify(a))
    try {
      window.dispatchEvent(new Event('ozk-fav'))
    } catch (e) {}
  }
  function useFav(R) {
    var st = R.useState(0)
    R.useEffect(function () {
      function f() {
        st[1](function (x) {
          return x + 1
        })
      }
      window.addEventListener('ozk-fav', f)
      return function () {
        window.removeEventListener('ozk-fav', f)
      }
    }, [])
    return st[0]
  }
  // Renk grupları: favoriler ve kendi eklediğimiz renkler "Çok Kullanılan" grubunun başına
  function favColors(g) {
    try {
      var fav = favList('colors')
      var all = g.popular.concat(g.standard, g.other)
      var byKey = {}
      all.forEach(function (c) {
        byKey[c.key] = c
      })
      var top = fav
        .map(function (k) {
          return byKey[k]
        })
        .filter(Boolean)
      all.forEach(function (c) {
        if (c.custom && top.indexOf(c) < 0) top.push(c)
      })
      function rest(arr) {
        return arr.filter(function (c) {
          return top.indexOf(c) < 0
        })
      }
      return { popular: top.concat(rest(g.popular)), standard: rest(g.standard), other: rest(g.other) }
    } catch (e) {
      return g
    }
  }
  // Hızlı renk düğmelerindeki minik yıldız
  function starMini(n, kind, key) {
    var on = isFav(kind, key)
    return n.jsx('span', {
      role: 'button',
      title: on ? 'Favorilerden çıkar' : 'Favorilere ekle (en üste taşır)',
      className: 'ozk-star-mini' + (on ? ' on' : ''),
      onClick: function (ev) {
        ev.stopPropagation()
        ev.preventDefault()
        toggleFav(kind, key)
      },
      children: on ? '★' : '☆',
    })
  }
  // Seçim kutusu + ★ düğmesi + en üstte "★ Favorilerim" grubu
  function collectOpts(el, out, depth) {
    if (!el || depth > 6) return
    if (Array.isArray(el)) {
      el.forEach(function (x) {
        collectOpts(x, out, depth + 1)
      })
      return
    }
    if (typeof el !== 'object') return
    if (el.type === 'option') {
      if (el.props && el.props.value != null) out.push({ v: String(el.props.value), c: el.props.children })
      return
    }
    if (typeof el.type === 'function') {
      try {
        collectOpts(el.type(el.props), out, depth + 1)
      } catch (e) {}
      return
    }
    if (el.props && el.props.children) collectOpts(el.props.children, out, depth + 1)
  }
  function FavSelect(p) {
    var n = p.n
    useFav(p.R)
    var props = p.props,
      kind = p.kind
    var opts = []
    collectOpts(props.children, opts, 0)
    var fav = favList(kind)
    var favOpts = fav
      .map(function (k) {
        for (var i = 0; i < opts.length; i++) if (opts[i].v === k) return opts[i]
        return null
      })
      .filter(Boolean)
    var ch = props.children
    var children = favOpts.length
      ? [
          n.jsx(
            'optgroup',
            {
              label: '★ Favorilerim',
              children: favOpts.map(function (o) {
                return n.jsx('option', { value: o.v, children: o.c }, 'fav-' + o.v)
              }),
            },
            'ozk-fav',
          ),
        ].concat(Array.isArray(ch) ? ch : [ch])
      : Array.isArray(ch)
        ? ch
        : [ch]
    var sel = n.jsxs(p.type, Object.assign({}, props, { children: children }))
    var cur = String(props.value == null ? '' : props.value)
    var on = fav.indexOf(cur) >= 0
    var canStar = opts.some(function (o) {
      return o.v === cur
    })
    return n.jsxs('div', {
      className: 'ozk-favwrap',
      children: [
        sel,
        n.jsx('button', {
          type: 'button',
          disabled: !canStar,
          title: on ? 'Seçili olanı favorilerden çıkar' : 'Seçili olanı favorilere ekle (listenin en üstüne çıkar)',
          className: 'ozk-star' + (on ? ' on' : ''),
          onClick: function () {
            toggleFav(kind, cur)
          },
          children: on ? '★' : '☆',
        }),
      ],
    })
  }
  function ws(R, n, kind, type, props, key) {
    try {
      return n.jsx(FavSelect, { R: R, n: n, kind: kind, type: type, props: props }, key)
    } catch (e) {
      return n.jsx(type, props, key)
    }
  }


  /* ============================================= MÜŞTERİ 3D TEKLİF DOSYASI (6.2) */
  // Fiyat, maliyet, katalog YOK: yalnızca ölçü, sistem, cam/renk adları, çizim ve 3D sahne
  function sleep(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms)
    })
  }
  function clickNav(re) {
    var b = Array.prototype.slice.call(document.querySelectorAll('header button')).filter(function (x) {
      return re.test((x.innerText || '').replace(/\s+/g, ' ').trim())
    })[0]
    if (b) b.click()
    return !!b
  }
  function busy(msg) {
    var d = document.getElementById('ozk-busy')
    if (!msg) {
      if (d) d.remove()
      return
    }
    if (!d) {
      d = document.createElement('div')
      d.id = 'ozk-busy'
      document.body.appendChild(d)
    }
    d.textContent = msg
  }
  function posLabel(p, i) {
    return p.pozCode || 'POZ ' + (i + 1)
  }
  async function exportCustomer3D(ctx) {
    var pr = ctx.project,
      cat = ctx.catalog,
      st = ctx.settings || {},
      c = pr.commercial || {}
    var lang = String(c.language || 'TR').toUpperCase()
    var positions = pr.positions || []
    if (!positions.length) return toast('Teklifte poz yok')
    // 1) teklif sayfasından çizimler ve profil bölümü (fiyatsız parçalar)
    var sheet = document.querySelector('.print-sheet:not(.print-only)')
    var svgs = [],
      specHTML = '',
      logo = ''
    if (sheet) {
      var list = Array.prototype.slice.call(sheet.children).filter(function (d) {
        return d.classList.contains('space-y-4')
      })[0]
      if (list)
        Array.prototype.slice.call(list.children).forEach(function (card) {
          var sv = card.querySelector('svg')
          svgs.push(sv ? sv.outerHTML : '')
        })
      var sp = sheet.querySelector('.ozk-spec')
      if (sp) specHTML = sp.outerHTML
      var lg = sheet.querySelector('img[alt^="Özkanoğlu"]')
      if (lg) logo = lg.src
    }
    // 2) her pozun 3D sahnesini topla (Çizim Stüdyosu → 3D)
    var scenes = {}
    try {
      busy('Müşteri 3D teklifi hazırlanıyor… 3D sahneler toplanıyor')
      clickNav(/^Çizim/)
      await sleep(700)
      var b3 = Array.prototype.slice.call(document.querySelectorAll('button')).filter(function (x) {
        return /3D 360/.test(x.innerText || '')
      })[0]
      if (b3) b3.click()
      await sleep(1200)
      for (var i = 0; i < positions.length; i++) {
        var p = positions[i]
        busy('Müşteri 3D teklifi hazırlanıyor… ' + posLabel(p, i) + ' (' + (i + 1) + '/' + positions.length + ')')
        var cards = document.querySelectorAll('aside div.group.cursor-pointer.rounded-xl')
        var t0 = Date.now()
        if (cards[i]) cards[i].click()
        var ok = false
        for (var k = 0; k < 40; k++) {
          await sleep(100)
          if (LIVE3D.pos && LIVE3D.pos.id === p.id && LIVE3D.group && (LIVE3D.t >= t0 || k > 8)) {
            ok = true
            break
          }
        }
        if (ok) {
          await sleep(350)
          try {
            scenes[p.id] = LIVE3D.group.toJSON()
          } catch (e) {}
        }
      }
    } finally {
      clickNav(/^Müşteri/)
      busy(null)
    }
    // 3) veri (fiyatsız)
    function geoOf(i) {
      var l = ctx.totals && ctx.totals.lines && ctx.totals.lines[i]
      return (l && l.geo) || {}
    }
    function nm(o) {
      return (o && (o.name || o.shortName)) || ''
    }
    var D = {
      v: 1,
      lang: lang,
      quoteNo: pr.quoteNo || '',
      date: new Date().toISOString().slice(0, 10),
      project: pr.projectName || '',
      customer: { name: (pr.customer && pr.customer.name) || '', company: (pr.customer && pr.customer.company) || '', country: (pr.customer && pr.customer.country) || '' },
      company: st.company
        ? { name: st.company.name || 'ÖZKANOĞLU', phone: st.company.phone || '', email: st.company.email || '', web: st.company.web || '', address: st.company.address || '' }
        : {},
      contact: drawnByLabel(pr.drawnBy),
      vinesso: !!c.includeVinesso,
      logo: logo,
      vinLogo: (document.querySelector('.ozk-vin-logo') || {}).src || '',
      incoterm: [c.incoterm, c.incotermPlace].filter(Boolean).join(' — '),
      spec: specHTML,
      positions: positions.map(function (p, i) {
        var g = cat.glasses && cat.glasses[p.glass]
        var hasTilt = false
        try {
          JSON.stringify(scenes[p.id] || {}).replace(/"opening":"tiltturn"/, function () {
            hasTilt = true
          })
        } catch (e) {}
        return {
          id: p.id,
          label: posLabel(p, i),
          title: p.title || '',
          qty: Math.max(1, Math.round(p.qty) || 1),
          w: geoOf(i).W_total || p.width || '',
          h: geoOf(i).H_total || p.height || '',
          series: nm(cat.series && cat.series[p.series]),
          glass: g ? gName(g, lang) : '',
          colorIn: nm(cat.colors && cat.colors[p.color]),
          colorOut: nm(cat.colors && cat.colors[p.colorOutside || p.color]),
          shutter: !!(p.shutter && (p.shutter.enabled || (p.shutter.type && p.shutter.type !== 'NONE'))),
          flyscreen: !!(p.flyscreen && (p.flyscreen.enabled || (p.flyscreen.type && p.flyscreen.type !== 'NONE'))),
          svg: svgs[i] || '',
          scene: scenes[p.id] || null,
          tilt: hasTilt,
        }
      }),
    }
    var missing = D.positions.filter(function (x) {
      return !x.scene
    })
    var html = customerHTML(D)
    var a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = 'Teklif-' + (D.quoteNo || 'PenCAD') + '-3D.html'
    document.body.appendChild(a)
    a.click()
    setTimeout(function () {
      URL.revokeObjectURL(a.href)
      a.remove()
    }, 1500)
    toast(
      'Müşteri 3D teklifi indirildi (fiyatsız) · ' +
        (html.length / 1048576).toFixed(1) +
        ' MB' +
        (missing.length
          ? ' · 3D alınamayan: ' +
            missing
              .map(function (x) {
                return x.label
              })
              .join(', ')
          : ''),
    )
  }
  function customer3DButton(n, ctx) {
    return n.jsx('button', {
      type: 'button',
      onClick: function () {
        exportCustomer3D(ctx)
      },
      className: 'mt-1 w-full rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-sky-500',
      children: '📱 Müşteri 3D Teklifi İndir (fiyatsız)',
    })
  }

  function customerHTML(D) {
    var three = (document.getElementById('ozk3-src') || {}).textContent || ''
    var data = JSON.stringify(D).replace(/<\//g, '<\\/').replace(new RegExp('<' + '!--', 'g'), '<\\u0021--')
    var TR = D.lang === 'TR'
    var L = TR
      ? { title: 'Teklif', quote: 'Teklif No', date: 'Tarih', customer: 'Müşteri', open: 'Kanatları aç', tilt: 'Vasistas', inside: 'İçeriden', outside: 'Dışarıdan', spin: '360°', size: 'Ölçü', qty: 'Adet', series: 'Profil sistemi', glass: 'Cam', cin: 'İç renk', cout: 'Dış renk', shutter: 'Panjur', fly: 'Sineklik', yes: 'Var', contact: 'Teklifi hazırlayan', hint: 'Döndürmek için sürükleyin · Yakınlaştırmak için iki parmak / tekerlek', drawing: 'Teknik çizim (içeriden bakış)', noscene: '3D görünüm bu poz için hazır değil' }
      : { title: 'Offer', quote: 'Offer No', date: 'Date', customer: 'Customer', open: 'Open sashes', tilt: 'Tilt', inside: 'Inside', outside: 'Outside', spin: '360°', size: 'Size', qty: 'Qty', series: 'Profile system', glass: 'Glazing', cin: 'Inside colour', cout: 'Outside colour', shutter: 'Roller shutter', fly: 'Insect screen', yes: 'Yes', contact: 'Prepared by', hint: 'Drag to rotate · Pinch / wheel to zoom', drawing: 'Technical drawing (inside view)', noscene: '3D view not available for this item' }
    var css =
      ':root{--ink:#0f172a;--mut:#64748b;--line:#e2e8f0;--navy:#002b5c;--gold:#b08d3c;--bg:#f4f1ec;--card:#ffffff}' +
      '*{box-sizing:border-box}body{margin:0;background:radial-gradient(60vmax 40vmax at 0% 0%,#fbe9d2,transparent 70%),radial-gradient(50vmax 40vmax at 100% 100%,#dfe9f6,transparent 70%),var(--bg);color:var(--ink);font:14px/1.45 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
      '.wrap{max-width:1180px;margin:0 auto;padding:16px}' +
      'header{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:18px;background:rgba(255,255,255,.72);backdrop-filter:blur(18px);box-shadow:0 8px 30px rgba(15,23,42,.08);border:1px solid rgba(255,255,255,.8)}' +
      '.brand{display:flex;align-items:center;gap:12px}.brand img{height:54px;width:auto}.vin{display:flex;align-items:baseline;gap:6px}.vin img{height:26px}.vin i{font-size:12px;color:var(--mut)}.vin b{letter-spacing:.14em;color:#2e3192;font-size:12px}' +
      '.meta{text-align:end;font-size:12.5px;color:var(--mut)}.meta b{color:var(--ink)}.meta h1{margin:0 0 4px;font-size:16px;letter-spacing:.04em;color:var(--navy);text-transform:uppercase}' +
      '.chips{display:flex;gap:8px;overflow-x:auto;padding:14px 2px 6px;scrollbar-width:thin}.chip{flex:none;border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 14px;font-weight:700;font-size:12.5px;color:var(--ink);cursor:pointer;white-space:nowrap}.chip span{color:var(--mut);font-weight:600;margin-inline-start:6px}.chip.on{background:var(--navy);color:#fff;border-color:var(--navy)}.chip.on span{color:#cfe0ff}' +
      '.grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:14px;margin-top:8px}@media(max-width:860px){.grid{grid-template-columns:1fr}}' +
      '.card{background:var(--card);border-radius:18px;box-shadow:0 8px 30px rgba(15,23,42,.07);border:1px solid #edf0f4;overflow:hidden}' +
      '#view{position:relative;height:min(68vh,620px);min-height:340px;background:linear-gradient(180deg,#eef2f7,#f8f6f2)}#view canvas{display:block;width:100%!important;height:100%!important;touch-action:none}' +
      '.ctrl{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;padding:12px 14px;border-top:1px solid var(--line)}.ctrl label{display:flex;align-items:center;gap:8px;font-weight:600;font-size:12.5px;color:var(--mut)}.ctrl input[type=range]{width:150px;accent-color:var(--gold)}.btns{display:flex;gap:6px;margin-inline-start:auto}.btns button{border:1px solid var(--line);background:#fff;border-radius:10px;padding:6px 10px;font-weight:700;font-size:12px;cursor:pointer}.btns button.on{background:var(--navy);color:#fff}' +
      '.hint{position:absolute;left:12px;bottom:10px;font-size:11px;color:var(--mut);background:rgba(255,255,255,.7);padding:4px 8px;border-radius:8px}.nos{position:absolute;inset:0;display:grid;place-items:center;color:var(--mut)}' +
      '.det{padding:16px}.det h2{margin:0 0 2px;font-size:17px;color:var(--navy)}.det .sub{color:var(--mut);font-size:12.5px;margin-bottom:10px}.row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px dotted #dbe2ea}.row span{color:var(--mut)}.row b{text-align:end}' +
      '.drw{padding:12px 16px 16px}.drw h3{margin:6px 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--navy)}.drw svg{width:100%;height:auto;max-height:360px;background:#fff;border-radius:12px;border:1px solid var(--line)}' +
      '.spec{margin-top:14px;padding:16px}' +
      '.ozk-spec{color:#0f172a}.ozk-spec-title{margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#002b5c}.ozk-spec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}.ozk-spec-card{display:flex;gap:10px;border:1px solid #dbe3ef;border-radius:12px;background:linear-gradient(160deg,#fff,#f5f8fc);padding:8px 10px}.ozk-spec-img{width:74px;height:128px;object-fit:contain;mix-blend-mode:multiply}.ozk-spec-body{flex:1;min-width:0;font-size:12px}.ozk-spec-brand{font-size:10px;font-weight:800;letter-spacing:.14em;color:#b08d3c}.ozk-spec-name{font-size:13px;font-weight:800;color:#002b5c;margin-bottom:4px}.ozk-spec-row{display:flex;justify-content:space-between;gap:8px;border-bottom:1px dotted #d5dde8;padding:2px 0}.ozk-spec-row span{color:#64748b}.ozk-spec-glass{width:100%;margin-top:10px;border-collapse:collapse;font-size:12px}.ozk-spec-glass th{background:#002b5c;color:#fff;text-align:start;padding:5px 7px}.ozk-spec-glass td{border-bottom:1px solid #e2e8f0;padding:5px 7px}' +
      '.tbl-wrap{overflow-x:auto}footer{margin:16px 0 8px;padding:14px 18px;border-radius:18px;background:rgba(255,255,255,.72);backdrop-filter:blur(18px);display:flex;flex-wrap:wrap;gap:8px 24px;justify-content:space-between;font-size:12.5px;color:var(--mut)}footer b{color:var(--ink)}'
    var app =
      '(function(){var D=JSON.parse(document.getElementById("ozk-data").textContent);var L=' +
      JSON.stringify(L) +
      ';var T=window.OZK3;function $(s){return document.querySelector(s)}function esc(t){return String(t==null?"":t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}' +
      // başlık
      'var br=D.vinesso&&D.vinLogo?\'<div class="vin"><img src="\'+D.vinLogo+\'" alt="VINESSO"><i>by</i><b>ÖZKANOĞLU</b></div>\':(D.logo?\'<img src="\'+D.logo+\'" alt="Özkanoğlu">\':\'<b style="font-size:20px;letter-spacing:.1em;color:#2e3192">ÖZKANOĞLU</b>\');' +
      '$("#brand").innerHTML=br;$("#meta").innerHTML="<h1>"+esc(L.title)+" #"+esc(D.quoteNo)+"</h1>"+esc(L.date)+": <b>"+esc(D.date)+"</b><br>"+esc(L.customer)+": <b>"+esc(D.customer.company||D.customer.name)+"</b>"+(D.customer.country?" · "+esc(D.customer.country):"");' +
      '$("#foot").innerHTML="<div><b>"+esc(L.contact)+":</b> "+esc(D.contact)+"</div><div><b>"+esc(D.company.name||"ÖZKANOĞLU")+"</b> · "+esc(D.company.phone)+" · "+esc(D.company.email)+" · "+esc(D.company.web)+"</div><div>"+esc(D.company.address)+"</div>";' +
      'if(D.spec){$("#spec").innerHTML=D.spec}else{$("#spec").style.display="none"}' +
      // 3D
      'var view=$("#view"),R=new T.WebGLRenderer({antialias:true,alpha:true});R.setPixelRatio(Math.min(devicePixelRatio||1,2));R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=1.1;R.shadowMap.enabled=true;view.appendChild(R.domElement);' +
      'var S=new T.Scene();var cv=document.createElement("canvas");cv.width=512;cv.height=256;var x=cv.getContext("2d");var g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,"#9cc7ec");g.addColorStop(.45,"#eef4f9");g.addColorStop(.5,"#ffffff");g.addColorStop(.58,"#cfc8ba");g.addColorStop(1,"#6f6a62");x.fillStyle=g;x.fillRect(0,0,512,256);var env=new T.CanvasTexture(cv);env.mapping=T.EquirectangularReflectionMapping;env.colorSpace=T.SRGBColorSpace;S.environment=env;' +
      'S.add(new T.HemisphereLight(0xffffff,0xb8b0a2,1.0));var dl=new T.DirectionalLight(0xffffff,1.6);dl.position.set(3,5,4);dl.castShadow=true;S.add(dl);var dl2=new T.DirectionalLight(0xdfe8ff,.7);dl2.position.set(-3,2,-4);S.add(dl2);var grid=new T.GridHelper(10,20,0xc9c2b6,0xe2ddd4);S.add(grid);' +
      'var C=new T.PerspectiveCamera(36,1,.02,60);var O=new T.OrbitControls(C,R.domElement);O.enableDamping=true;O.dampingFactor=.08;O.minDistance=.3;O.maxDistance=14;' +
      'var vm="in";function size(){var w=view.clientWidth,h=view.clientHeight;R.setSize(w,h,false);C.aspect=w/h;C.updateProjectionMatrix();if(cur&&vm!=="spin")view3(vm)}addEventListener("resize",size);size();' +
      'var cur=null,piv=[],ctr=new T.Vector3(),rad=1,openV=0,openT=0,tiltV=0,tiltT=0;var loader=new T.ObjectLoader();' +
      'function cl(v){return v<0?0:v>1?1:v}function ez(v){v=cl(v);return v*v*(3-2*v)}' +
      'function apply(){piv.forEach(function(p){var u=p.userData.ozk,o=p;var lev=u.lever?cur.getObjectByProperty("uuid",u.lever):null;var lv=u.levye?cur.getObjectByProperty("uuid",u.levye):null;var Ov=openV;' +
      'if(u.opening==="slide"||u.opening==="liftslide"){if(u.slideDir){o.position.x=u.baseX+u.slideDir*u.slideTravelM*(u.opening==="liftslide"?cl((Ov-.12)/.88):Ov)}if(lev&&u.opening==="liftslide")lev.rotation.z=cl(Ov/.15)*Math.PI;return}' +
      'if(u.opening==="tilt"){o.rotation.x=(u.openDirection==="outward"?-1:1)*Ov*Math.PI/9;return}' +
      'var U=u.openDirection==="outward"?1:-1;function turn(q){var a=q*Math.PI*.44;o.rotation.y=u.hinge==="left"?U*a:-U*a}' +
      'if(u.role==="hokPassive"){if(lv)lv.rotation.x=-ez((Ov-.6)/.12)*Math.PI*.55;o.rotation.x=0;turn(ez((Ov-.72)/.28));return}' +
      'var q=u.role==="hokActive"?ez((Ov-.08)/.5):ez((Ov-.08)/.92);' +
      'if(u.opening==="tiltturn"&&tiltV>.001&&Ov<.001){o.rotation.y=0;o.rotation.x=(u.openDirection==="outward"?-1:1)*ez((tiltV-.08)/.92)*Math.PI/9;if(lev&&!u.door)lev.rotation.z=Math.PI*ez(tiltV/.12);return}' +
      'o.rotation.x=0;turn(q);if(lev){if(u.door){lev.rotation.z=-(u.right?-1:1)*.6*Math.sin(Math.PI*cl(Ov/.2))}else lev.rotation.z=(u.right?-1:1)*Math.PI/2*ez(Ov/.1)}})}' +
      'function show(i){var P=D.positions[i];[].forEach.call(document.querySelectorAll(".chip"),function(c,k){c.classList.toggle("on",k===i)});' +
      '$("#det").innerHTML="<h2>"+esc(P.label)+" · "+esc(P.title)+"</h2><div class=sub>"+esc(P.w)+" × "+esc(P.h)+" mm · "+esc(L.qty)+": "+esc(P.qty)+"</div>"+[[L.series,P.series],[L.glass,P.glass],[L.cin,P.colorIn],[L.cout,P.colorOut],[L.shutter,P.shutter?L.yes:""],[L.fly,P.flyscreen?L.yes:""]].filter(function(r){return r[1]}).map(function(r){return"<div class=row><span>"+esc(r[0])+"</span><b>"+esc(r[1])+"</b></div>"}).join("");' +
      '$("#drw").innerHTML=P.svg?"<h3>"+esc(L.drawing)+"</h3>"+P.svg:"";' +
      'if(cur){S.remove(cur);cur.traverse(function(o){o.geometry&&o.geometry.dispose()})}cur=null;piv=[];$("#nos").style.display=P.scene?"none":"grid";$("#tiltbox").style.display=P.tilt?"":"none";openV=openT=0;tiltV=tiltT=0;$("#open").value=0;$("#tilt").value=0;if(!P.scene)return;' +
      'cur=loader.parse(P.scene);cur.traverse(function(o){if(o.userData&&o.userData.ozk)piv.push(o);if(o.isMesh){o.castShadow=true}});S.add(cur);apply();var b=new T.Box3().setFromObject(cur);b.getCenter(ctr);rad=b.getSize(new T.Vector3()).length()/2||1;grid.position.y=b.min.y;view3("in")}' +
      'function view3(m){vm=m;[].forEach.call(document.querySelectorAll(".btns button"),function(b){b.classList.toggle("on",b.dataset.v===m)});O.autoRotate=m==="spin";O.autoRotateSpeed=2;if(m==="spin")return;var d=rad*2.5/Math.min(1,C.aspect*0.95),s=m==="out"?-1:1;C.position.set(ctr.x+d*.42,ctr.y+d*.16,ctr.z+s*d);O.target.copy(ctr);O.update()}' +
      'D.positions.forEach(function(P,i){var b=document.createElement("button");b.className="chip";b.innerHTML=esc(P.label)+"<span>"+esc(P.w)+"×"+esc(P.h)+"</span>";b.onclick=function(){show(i)};$("#chips").appendChild(b)});' +
      '$("#open").oninput=function(){openT=this.value/100};$("#tilt").oninput=function(){tiltT=this.value/100};[].forEach.call(document.querySelectorAll(".btns button"),function(b){b.onclick=function(){view3(b.dataset.v)}});' +
      '(function loop(){requestAnimationFrame(loop);var ch=false;if(Math.abs(openT-openV)>8e-4){openV+=(openT-openV)*.12;ch=true}if(Math.abs(tiltT-tiltV)>8e-4){tiltV+=(tiltT-tiltV)*.12;ch=true}if(ch&&cur)apply();O.update();R.render(S,C)})();show(0)})();'
    var body =
      '<div class="wrap"><header><div class="brand" id="brand"></div><div class="meta" id="meta"></div></header>' +
      '<div class="chips" id="chips"></div>' +
      '<div class="grid"><div class="card"><div id="view"><div class="nos" id="nos">' + L.noscene + '</div><div class="hint">' + L.hint + '</div></div>' +
      '<div class="ctrl"><label>' + L.open + ' <input id="open" type="range" min="0" max="100" value="0"></label><label id="tiltbox">' + L.tilt + ' <input id="tilt" type="range" min="0" max="100" value="0"></label>' +
      '<div class="btns"><button data-v="in" class="on">' + L.inside + '</button><button data-v="out">' + L.outside + '</button><button data-v="spin">' + L.spin + '</button></div></div></div>' +
      '<div class="card"><div class="det" id="det"></div><div class="drw" id="drw"></div></div></div>' +
      '<div class="card spec tbl-wrap" id="spec"></div><footer id="foot"></footer></div>'
    return (
      '<!doctype html><html lang="' + (TR ? 'tr' : 'en') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
      esc((TR ? 'Teklif ' : 'Offer ') + '#' + D.quoteNo + ' — ' + (D.vinesso ? 'VINESSO by Özkanoğlu' : 'Özkanoğlu')) +
      '</title><style>' + css + '</style></head><body>' + body +
      '<script type="application/json" id="ozk-data">' + data + '<\/script><script>' + three + '<\/script><script>' + app + '<\/script></body></html>'
    )
  }

  /* ------------------------------------------------ alt araç çubuğu (dock) */
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function closePop() {
    var p = document.getElementById('ozk-pop')
    if (p) p.remove()
  }
  function openPop(html, onMount) {
    closePop()
    var p = document.createElement('div')
    p.id = 'ozk-pop'
    p.className = 'ozk-no-print ozk-glass'
    p.innerHTML = html
    document.body.appendChild(p)
    if (onMount) onMount(p)
    return p
  }
  function toast(msg) {
    var t = document.createElement('div')
    t.className = 'ozk-toast ozk-no-print'
    t.textContent = msg
    document.body.appendChild(t)
    setTimeout(function () {
      t.remove()
    }, 2600)
  }

  function userPop() {
    var list = users()
    var act = activeUser().id
    openPop(
      '<h4>Çizen / teklif veren kişi</h4><p class="ozk-mut">Teklifte bu kişinin adı ve telefonu yazar. ERP\'ye geçince giriş yapan kullanıcıdan otomatik gelecek.</p>' +
        list
          .map(function (u, i) {
            return (
              '<div class="ozk-row' + (u.id === act ? ' on' : '') + '" data-i="' + i + '">' +
              '<label><input type="radio" name="ozk-u" ' + (u.id === act ? 'checked' : '') + '></label>' +
              '<input data-f="name" value="' + esc(u.name) + '" placeholder="Ad Soyad">' +
              '<input data-f="phone" value="' + esc(u.phone) + '" placeholder="Telefon">' +
              '<input data-f="email" value="' + esc(u.email) + '" placeholder="E-posta">' +
              '<button data-del title="Sil">✕</button></div>'
            )
          })
          .join('') +
        '<div class="ozk-act"><button data-add>+ Kişi ekle</button><button data-save class="pri">Kaydet</button></div>',
      function (p) {
        p.addEventListener('click', function (e) {
          var row = e.target.closest('.ozk-row')
          if (e.target.matches('[data-add]')) {
            list.push({ id: 'u' + Date.now().toString(36), name: '', phone: '', email: '' })
            saveUsers(collect(p, list))
            userPop()
          } else if (e.target.matches('[data-del]') && row) {
            var l2 = collect(p, list)
            l2.splice(+row.dataset.i, 1)
            if (l2.length) saveUsers(l2)
            userPop()
          } else if (e.target.matches('[data-save]')) {
            var l3 = collect(p, list).filter(function (u) {
              return u.name.trim()
            })
            saveUsers(l3)
            var sel = p.querySelector('input[name=ozk-u]:checked')
            var idx = sel ? +sel.closest('.ozk-row').dataset.i : 0
            setPref(AKEY, (l3[idx] || l3[0]).id)
            closePop()
            refreshDock()
            toast('Çizen kişi: ' + userName())
          }
        })
      },
    )
    function collect(p, base) {
      return Array.prototype.map.call(p.querySelectorAll('.ozk-row'), function (r, i) {
        var o = { id: (base[i] && base[i].id) || 'u' + i }
        r.querySelectorAll('input[data-f]').forEach(function (inp) {
          o[inp.dataset.f] = inp.value.trim()
        })
        return o
      })
    }
  }

  function colorPop() {
    var list = []
    try {
      list = JSON.parse(localStorage.getItem(CKEY) || '[]')
    } catch (e) {}
    openPop(
      '<h4>Renk ekle</h4><p class="ozk-mut">Eklenen renk tüm renk listelerine ve katalog fiyatına (renkli sınıf) girer. Kaydedince sayfa yenilenir, projeniz kaybolmaz.</p>' +
        '<div class="ozk-form"><input id="ozk-cn" placeholder="Renk adı (ör. Antrasit Mat 7016)">' +
        '<input id="ozk-cc" placeholder="Kod (ör. 7016 05)"><input id="ozk-cf" type="color" value="#8a6a4a">' +
        '<label class="ozk-chk"><input id="ozk-cw" type="checkbox"> Ahşap desenli</label></div>' +
        '<div class="ozk-act"><button data-addc class="pri">Ekle ve uygula</button></div>' +
        (list.length
          ? '<h5>Eklediğiniz renkler</h5>' +
            list
              .map(function (c, i) {
                return '<div class="ozk-crow"><span style="background:' + esc(c.fill) + '"></span>' + esc(c.name) + ' <small>' + esc(c.code) + '</small><button data-delc="' + i + '">✕</button></div>'
              })
              .join('')
          : ''),
      function (p) {
        p.addEventListener('click', function (e) {
          if (e.target.matches('[data-addc]')) {
            var name = p.querySelector('#ozk-cn').value.trim()
            if (!name) return toast('Renk adı yazın')
            var fill = p.querySelector('#ozk-cf').value
            list.push({ key: 'USR_' + Date.now().toString(36).toUpperCase(), name: name + ' (Özel)', code: p.querySelector('#ozk-cc').value.trim() || '-', fill: fill, stroke: shade(fill, -0.45), woodgrain: p.querySelector('#ozk-cw').checked })
            localStorage.setItem(CKEY, JSON.stringify(list))
            location.reload()
          } else if (e.target.matches('[data-delc]')) {
            list.splice(+e.target.dataset.delc, 1)
            localStorage.setItem(CKEY, JSON.stringify(list))
            location.reload()
          }
        })
      },
    )
  }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16)
    var r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255
    var t = f < 0 ? 0 : 255,
      k = Math.abs(f)
    function c(v) {
      return Math.round((t - v) * k + v)
    }
    return '#' + ((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1)
  }

  function refreshDock() {
    var b = document.querySelector('#ozk-theme-ui [data-user] span')
    if (b) b.textContent = userName()
  }

  function buildUI() {
    if (document.getElementById('ozk-theme-ui')) return
    var d = document.createElement('div')
    d.id = 'ozk-theme-ui'
    d.className = 'ozk-no-print'
    d.innerHTML =
      '<button data-v="day" title="Gündüz modu — açık, yumuşak kâğıt tonu">☀<span>Gündüz</span></button>' +
      '<button data-v="night" title="Gece modu — koyu, düşük parlaklık">☾<span>Gece</span></button>' +
      '<button data-v="auto" title="Otomatik: 07:00–19:00 gündüz, diğer saatler gece">◐<span>Oto</span></button>' +
      '<i></i><button data-eye title="Göz koruma — mavi ışığı azaltan sıcak filtre">◉<span>Göz koruma</span></button>' +
      '<i></i><button data-user title="Çizen / teklif veren kişi">👤<span class="ozk-keep">' + esc(userName()) + '</span></button>' +
      '<button data-color title="Kendi rengini ekle">🎨<span>Renk ekle</span></button>' +
      '<button data-ai title="AI ölçü okuma — belge / fotoğraftan poz çıkar">✨<span class="ozk-keep">AI Ölçü</span></button>'
    d.addEventListener('click', function (ev) {
      var b = ev.target.closest('button')
      if (!b) return
      if (b.hasAttribute('data-eye')) setPref(EKEY, getPref(EKEY, '1') === '1' ? '0' : '1')
      else if (b.hasAttribute('data-user')) return userPop()
      else if (b.hasAttribute('data-color')) return colorPop()
      else if (b.hasAttribute('data-ai')) return window.OZKV && OZKV.aiOpen ? OZKV.aiOpen() : toast('AI ölçü okuma yükleniyor…')
      else setPref(TKEY, b.getAttribute('data-v'))
      applyTheme()
    })
    document.addEventListener('mousedown', function (e) {
      var p = document.getElementById('ozk-pop')
      if (p && !p.contains(e.target) && !d.contains(e.target)) closePop()
    })
    document.body.appendChild(d)
    var f = document.createElement('div')
    f.id = 'ozk-eye-filter'
    f.className = 'ozk-no-print'
    document.body.appendChild(f)
    applyTheme()
  }

  applyTheme()
  applyAntet()
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function () {
      applyAntet()
    })
  genTextures()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI)
  else buildUI()
  setInterval(applyTheme, 5 * 60 * 1000)

  window.OZKV = {
    version: '6.2',
    rehauColors: rehauColors,
    extraColors: extraColors,
    users: users,
    saveUsers: saveUsers,
    activeUser: activeUser,
    userName: userName,
    fixDrawn: fixDrawn,
    drawnByLabel: drawnByLabel,
    vinessoLockup: vinessoLockup,
    NEW_ADDRESS: NEW_ADDRESS,
    toast: toast,
    openPop: openPop,
    closePop: closePop,
    esc: esc,
    defs: defs,
    glassFill: glassFill,
    paneFx: paneFx,
    ring: ring,
    bar: bar,
    gName: gName,
    classify: classify,
    mat3D: mat3D,
    glass3D: glass3D,
    fix3D: fix3D,
    applyTheme: applyTheme,
    montajUI: montajUI,
    montajLine: montajLine,
    terms: terms,
    specSection: specSection,
    applyAntet: applyAntet,
    issuedPanel: issuedPanel,
    ws: ws,
    glassLayers: glassLayers,
    lever3D: lever3D,
    anim3D: anim3D,
    _reg: REG,
    exportCustomer3D: exportCustomer3D,
    _tilt: TILT,
    useFav: useFav,
    favColors: favColors,
    starMini: starMini,
    toggleFav: toggleFav,
    issuedList: issuedList,
  }
})()
