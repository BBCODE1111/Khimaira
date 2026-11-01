"""Reproduce web delivery assets without changing the full-size source assets.
Requires Pillow 11.3.0 and fonttools[woff] 4.60.2 (only at asset authoring time).
Run: python scripts/optimize-web-media.py
"""
from pathlib import Path
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools import subset

project = Path(__file__).resolve().parents[1]
root = project / 'dist'
originals = project / 'assets' / 'web-source'
# Preserve the original full-resolution WebPs for provenance; encode small
# display derivatives. No crop, recolouring or content generation.
for name, size, quality in [('khimaira-bronze', (128, 128), 82),
                            ('temple-blue', (960, 960), 55),
                            ('button-dark', (480, 160), 75),
                            ('button-ivory', (480, 160), 75)]:
    with Image.open(originals / (name + '.webp')) as source:
        source.thumbnail(size, Image.Resampling.LANCZOS)
        target = root / (name + '-web.webp')
        source.save(target, 'WEBP', quality=quality, method=6)
        print(target.name, source.size, target.stat().st_size)
for name in ['DMSans', 'Cinzel']:
    font = TTFont(originals / (name + '.ttf'))
    # Keep the site's Latin, Greek, Roman-numeral and music-symbol coverage;
    # Chinese remains the existing system-font fallback. Retain variable axes.
    options = subset.Options()
    options.layout_features = ['*']
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=list(range(0x250)) + list(range(0x300, 0x400)) +
                       list(range(0x2000, 0x2200)) + list(range(0x266D, 0x2670)))
    subsetter.subset(font)
    font.flavor = 'woff2' 
    target = root / 'fonts' / (name + '.woff2')
    font.save(target)
    print(target.name, target.stat().st_size)
