"""Convierte los HTML exportados de Stitch a JSX fiel.

Cada HTML trae su propio `tailwind.config` y los nombres de token chocan entre archivos
(p. ej. `primary` es #002445 en unos y #173A5F en otros). Para que cada pantalla se vea
idéntica a su diseño, los tokens de color/fuente de ESE archivo se resuelven a valores
arbitrarios de Tailwind (`bg-[#173A5F]`), que no dependen de ninguna configuración global.

Uso: python3 convert.py  → escribe jsx/<nombre>.jsx.txt (el <body> ya en JSX).
"""
import glob
import os
import re
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'jsx')
os.makedirs(OUT, exist_ok=True)

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
ATTR_MAP = {'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'readonly': 'readOnly',
            'maxlength': 'maxLength', 'autocomplete': 'autoComplete', 'viewbox': 'viewBox',
            'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin',
            'fill-rule': 'fillRule', 'clip-rule': 'clipRule', 'colspan': 'colSpan', 'rowspan': 'rowSpan',
            'datetime': 'dateTime', 'inputmode': 'inputMode', 'enterkeyhint': 'enterKeyHint',
            'stop-color': 'stopColor', 'stop-opacity': 'stopOpacity', 'stroke-dasharray': 'strokeDasharray',
            'stroke-dashoffset': 'strokeDashoffset', 'font-variation-settings': 'fontVariationSettings'}
COLOR_UTILS = ('bg', 'text', 'border', 'border-t', 'border-b', 'border-l', 'border-r', 'border-x', 'border-y',
               'ring', 'ring-offset', 'from', 'via', 'to', 'fill', 'stroke', 'outline', 'divide', 'accent',
               'placeholder', 'decoration', 'shadow', 'caret')


def parse_config(html):
    m = re.search(r'tailwind\.config\s*=\s*(\{.*?\})\s*;?\s*</script>', html, re.S)
    colors, fonts = {}, {}
    if not m:
        return colors, fonts
    cfg = m.group(1)
    cm = re.search(r'["\']?colors["\']?\s*:\s*\{', cfg)
    if cm:
        depth, i = 1, cm.end()
        while depth and i < len(cfg):
            depth += {'{': 1, '}': -1}.get(cfg[i], 0)
            i += 1
        body = cfg[cm.end():i - 1]
        for blk in re.finditer(r'["\']?([\w-]+)["\']?\s*:\s*\{([^{}]*)\}', body):
            for k, v in re.findall(r'["\']?([\w-]+)["\']?\s*:\s*["\'](#[0-9a-fA-F]{3,8})["\']', blk.group(2)):
                colors[f'{blk.group(1)}-{k}'] = v
                if k == 'DEFAULT':
                    colors[blk.group(1)] = v
        flat = re.sub(r'["\']?[\w-]+["\']?\s*:\s*\{[^{}]*\}', '', body)
        for k, v in re.findall(r'["\']?([\w-]+)["\']?\s*:\s*["\'](#[0-9a-fA-F]{3,8})["\']', flat):
            colors[k] = v
    fm = re.search(r'["\']?fontFamily["\']?\s*:\s*\{(.*?)\}\s*[,}]', cfg, re.S)
    if fm:
        for k, v in re.findall(r'["\']?([\w-]+)["\']?\s*:\s*\[\s*["\']([^"\']+)["\']', fm.group(1)):
            fonts[k] = v
    return colors, fonts


def map_class(cls, colors, fonts):
    out = []
    for tok in cls.split():
        prefix, _, base = tok.rpartition(':')
        neg = ''
        core = base
        if core.startswith('!'):
            neg, core = '!', core[1:]
        new = core
        # font-headline / font-body …
        if core.startswith('font-') and core[5:] in fonts:
            fam = fonts[core[5:]]
            new = 'font-sans' if fam == 'Montserrat' else f"font-['{fam.replace(' ', '_')}']"
        else:
            for u in sorted(COLOR_UTILS, key=len, reverse=True):
                if core.startswith(u + '-'):
                    rest = core[len(u) + 1:]
                    name, slash, alpha = rest.partition('/')
                    if name in colors:
                        new = f'{u}-[{colors[name]}]' + (slash + alpha if slash else '')
                    break
        out.append((prefix + ':' if prefix else '') + neg + new)
    return ' '.join(out)


def style_to_obj(style):
    parts = []
    for decl in style.split(';'):
        if ':' not in decl:
            continue
        k, v = decl.split(':', 1)
        k, v = k.strip(), v.strip().replace("'", "\\'")
        if not k:
            continue
        if k.startswith('--'):
            key = f"'{k}'"
        else:
            key = re.sub(r'-([a-z])', lambda m: m.group(1).upper(), k)
        parts.append(f"{key}: '{v}'")
    return '{{' + ', '.join(parts) + '}}'


class Conv(HTMLParser):
    def __init__(self, colors, fonts):
        super().__init__(convert_charrefs=False)
        self.colors, self.fonts = colors, fonts
        self.out, self.in_body, self.skip = [], False, 0

    def attrs(self, attrs):
        res = []
        for k, v in attrs:
            if k.startswith('on'):
                continue
            nk = ATTR_MAP.get(k, k)
            if k == 'class':
                res.append(f'className="{map_class(v or "", self.colors, self.fonts)}"')
            elif k == 'style':
                res.append(f'style={style_to_obj(v or "")}')
            elif v is None:
                res.append(nk)
            else:
                res.append(f'{nk}="{v.replace(chr(34), "&quot;")}"')
        return (' ' + ' '.join(res)) if res else ''

    def handle_starttag(self, tag, attrs):
        if tag == 'body':
            self.in_body = True
            return
        if not self.in_body:
            return
        if tag in ('script', 'style'):
            self.skip += 1
            return
        if self.skip:
            return
        self.out.append(f'<{tag}{self.attrs(attrs)}{" /" if tag in VOID else ""}>')

    def handle_startendtag(self, tag, attrs):
        if self.in_body and not self.skip:
            self.out.append(f'<{tag}{self.attrs(attrs)} />')

    def handle_endtag(self, tag):
        if tag == 'body':
            self.in_body = False
            return
        if not self.in_body:
            return
        if tag in ('script', 'style'):
            self.skip -= 1
            return
        if self.skip or tag in VOID:
            return
        self.out.append(f'</{tag}>')

    def handle_data(self, data):
        if self.in_body and not self.skip:
            self.out.append(data.replace('{', '&#123;').replace('}', '&#125;'))

    def handle_entityref(self, name):
        if self.in_body and not self.skip:
            self.out.append(f'&{name};')

    def handle_charref(self, name):
        if self.in_body and not self.skip:
            self.out.append(f'&#{name};')

    def handle_comment(self, data):
        if self.in_body and not self.skip:
            self.out.append('{/* ' + data.strip().replace('*/', '') + ' */}')


def extra_css(html):
    """CSS propio del archivo (<style>), para revisar si hay clases utilitarias custom."""
    return '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', html, re.S))


for path in sorted(glob.glob(os.path.join(HERE, '*.html'))):
    name = os.path.splitext(os.path.basename(path))[0]
    html = open(path, encoding='utf-8').read()
    colors, fonts = parse_config(html)
    c = Conv(colors, fonts)
    c.feed(html)
    body = ''.join(c.out)
    open(os.path.join(OUT, f'{name}.jsx.txt'), 'w').write(body)
    css = extra_css(html)
    if css.strip():
        open(os.path.join(OUT, f'{name}.css.txt'), 'w').write(css)
    print(f'{name}: {len(colors)} colores, {len(fonts)} fuentes, {len(body)} chars')
