"""Stage the 0.3 shell and byte-identical engine dependencies; never embed the website."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import sys, re, shutil, hashlib, json
root = Path(__file__).resolve().parents[1]
stage = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else stage.parent/'ui.zip'
if stage.exists(): shutil.rmtree(stage)
shutil.copytree(root/'web', stage)
engine = stage/'engine'; engine.mkdir()
source = root.parent/'dist'
pending = ['piano-tools.js','style-engine.js','performance.js','music.js','voicing.js','arpeggiator.js','solutions.js','example-pool.js','harmony-actions.js']
seen = set()
while pending:
    name = pending.pop()
    if name in seen: continue
    assert '/' not in name and name.endswith('.js'), name
    seen.add(name)
    data = (source/name).read_bytes()
    (engine/name).write_bytes(data)
    pending.extend(re.findall(r'''from\s*['"]\./([^'"?]+)(?:\?[^'"]*)?['"]''', data.decode()))
manifest = {name:hashlib.sha256((engine/name).read_bytes()).hexdigest() for name in sorted(seen)}
(engine/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(output,'w',ZIP_DEFLATED) as z:
    for p in sorted(stage.rglob('*')):
        if p.is_file(): z.write(p,p.relative_to(stage).as_posix())
print(f'Packed compact MIDI shell + {len(seen)} unchanged engine modules; no website HTML or piano samples.')
