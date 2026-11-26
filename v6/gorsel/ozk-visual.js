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
      rehau: { series: r.series, renolit: r.renolit, nameEN: r.nameEN, kind: r.kind },
    }
    texByColorKey[r.key] = r.tex
  })
  // 6.0'daki mevcut ahşap renklerini aynı desenin gerçek dokusuna bağla
  var LEGACY_TEX = { GOLDEN_OAK: 'p06', WINCHESTER: 'p05', IRISH_OAK: 'p04', DARK_OAK: 'p10' }

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
  function fix3D(group, CT, scene) {
    try {
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
    } catch (e) {}
  }

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
  function buildUI() {
    if (document.getElementById('ozk-theme-ui')) return
    var d = document.createElement('div')
    d.id = 'ozk-theme-ui'
    d.className = 'ozk-no-print'
    d.innerHTML =
      '<button data-v="day" title="Gündüz modu — açık, yumuşak kâğıt tonu">☀<span>Gündüz</span></button>' +
      '<button data-v="night" title="Gece modu — koyu, düşük parlaklık">☾<span>Gece</span></button>' +
      '<button data-v="auto" title="Otomatik: 07:00–19:00 gündüz, diğer saatler gece">◐<span>Oto</span></button>' +
      '<i></i><button data-eye title="Göz koruma — mavi ışığı azaltan sıcak filtre">◉<span>Göz koruma</span></button>'
    d.addEventListener('click', function (ev) {
      var b = ev.target.closest('button')
      if (!b) return
      if (b.hasAttribute('data-eye')) setPref(EKEY, getPref(EKEY, '1') === '1' ? '0' : '1')
      else setPref(TKEY, b.getAttribute('data-v'))
      applyTheme()
    })
    document.body.appendChild(d)
    var f = document.createElement('div')
    f.id = 'ozk-eye-filter'
    f.className = 'ozk-no-print'
    document.body.appendChild(f)
    applyTheme()
  }

  applyTheme()
  genTextures()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI)
  else buildUI()
  setInterval(applyTheme, 5 * 60 * 1000)

  window.OZKV = {
    version: '6.1',
    rehauColors: rehauColors,
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
  }
})()
