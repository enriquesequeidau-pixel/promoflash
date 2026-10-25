#!/usr/bin/env python3
"""Apply a visual-only PromoFlash theme safely to the existing static site.

The homepage embeds demo images (>500 KB). This script patches that original file
in place while refusing silent mismatches, instead of recreating its contents.
It must not change product generation, auth, analytics, or payments.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CSS = '<link rel="stylesheet" href="brand.css?v=20261025">'
ICON = '<link rel="icon" type="image/svg+xml" href="brand-symbol.svg">'


def read(name):
    return (ROOT / name).read_text(encoding="utf-8")


def save(name, old, new):
    if old == new:
        raise AssertionError(f"No branding changes applied to {name}")
    (ROOT / name).write_text(new, encoding="utf-8")
    print(f"Updated {name}: {len(old)} -> {len(new)} chars")


def replace_once(source, old, new, file):
    amount = source.count(old)
    if amount != 1:
        raise AssertionError(f"{file}: expected exactly one occurrence of {old[:90]!r}, found {amount}")
    return source.replace(old, new, 1)


logo_head = ('<a href="./" class="logo" aria-label="PromoFlash inicio">'
             '<span class="logomark">✳</span> promo<span>flash</span><sup>®</sup></a>')
logo_head_new = ('<a href="./" class="logo" aria-label="PromoFlash inicio">'
                 '<img class="brand-symbol" src="brand-symbol.svg" alt="" width="44" height="44">'
                 '<span class="brand-label"><span class="brand-promo">Promo</span>'
                 '<span class="brand-flash">Flash</span></span></a>')
logo_footer = '<a href="./" class="logo"><span class="logomark">✳</span> promo<span>flash</span></a>'
logo_footer_new = ('<a href="./" class="logo" aria-label="PromoFlash inicio">'
                   '<img class="brand-symbol" src="brand-symbol.svg" alt="" width="44" height="44">'
                   '<span class="brand-label"><span class="brand-promo">Promo</span>'
                   '<span class="brand-flash">Flash</span></span></a>')

s = read("index.html")
old = s
s = replace_once(s, '<meta name="theme-color" content="#171629">', '<meta name="theme-color" content="#150a2c">', "index.html")
s = replace_once(s, '</style>\n</head>', '</style>\n' + ICON + '\n' + CSS + '\n</head>', "index.html")
s = replace_once(s, '<body>', '<body class="pf-brand pf-landing">', "index.html")
s = replace_once(s, logo_head, logo_head_new, "index.html")
s = replace_once(s, logo_footer, logo_footer_new, "index.html")
assert s.count("window.PROMOFLASH_DEMOS=") == old.count("window.PROMOFLASH_DEMOS=") == 1
assert s.count("data:image/png;base64,") == old.count("data:image/png;base64,")
assert s.count("href=\"editor.html\"") == old.count("href=\"editor.html\"")
save("index.html", old, s)

s = read("editor.html")
old = s
s = replace_once(s, '<meta name="theme-color" content="#f7f6f2">', '<meta name="theme-color" content="#150a2c">', "editor.html")
s = replace_once(s, '<link rel="stylesheet" href="editor.css">', '<link rel="stylesheet" href="editor.css">\n  ' + ICON + '\n  ' + CSS, "editor.html")
s = replace_once(s, '<body>', '<body class="pf-brand pf-editor">', "editor.html")
s = replace_once(s,
    '<span class="flash-mark">✳</span> promo<span>flash</span><sup>studio</sup>',
    '<img class="brand-symbol" src="brand-symbol.svg" alt="" width="44" height="44">'
    '<span class="brand-label"><span class="brand-promo">Promo</span><span class="brand-flash">Flash</span></span><sup>studio</sup>',
    "editor.html")
s = replace_once(s, '<span>✳ PromoFlash Studio</span>', '<span>⚡ PromoFlash Studio</span>', "editor.html")
for token in ('id="photo"', 'id="generate"', 'id="downloadAll"', 'id="remix"', 'src="editor.js"', 'href="cuenta.html"'):
    assert token in s and token in old, token
save("editor.html", old, s)

s = read("cuenta.html")
old = s
s = replace_once(s, '</style></head>', '</style>' + ICON + CSS + '</head>', "cuenta.html")
s = replace_once(s, '<body>', '<body class="pf-brand pf-account">', "cuenta.html")
s = replace_once(s, '<a href="./index.html">✳ PromoFlash</a>',
    '<a href="./index.html" aria-label="PromoFlash inicio">'
    '<img class="brand-symbol" src="brand-symbol.svg" alt="" width="38" height="38">'
    '<span class="brand-promo">Promo</span><span class="brand-flash">Flash</span></a>',
    "cuenta.html")
for token in ('id="signedOut"', 'id="email"', 'id="password"', 'id="resetPassword"', 'src="cuenta.js', 'Content-Security-Policy'):
    assert token in s and token in old, token
save("cuenta.html", old, s)

s = read("privacidad.html")
old = s
s = replace_once(s, '</style></head>', '</style>' + ICON + CSS + '</head>', "privacidad.html")
s = replace_once(s, '<body>', '<body class="pf-brand pf-legal">', "privacidad.html")
save("privacidad.html", old, s)

s = read("terminos.html")
old = s
s = replace_once(s, '</style><a href="./">', '</style>' + ICON + CSS + '<body class="pf-brand pf-legal"><a href="./">', "terminos.html")
s = replace_once(s, '</footer></html>', '</footer></body></html>', "terminos.html")
save("terminos.html", old, s)

print("Visual refresh applied; functional JavaScript and configuration not modified.")
