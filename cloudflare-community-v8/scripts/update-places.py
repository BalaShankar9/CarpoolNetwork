"""Refresh the UK town/city directory from GeoNames CC BY 4.0 data."""
from pathlib import Path
import io,json,urllib.request,zipfile
root=Path(__file__).resolve().parent.parent
archive=urllib.request.urlopen('https://download.geonames.org/export/dump/GB.zip',timeout=60).read()
counties={}
for line in urllib.request.urlopen('https://download.geonames.org/export/dump/admin2Codes.txt',timeout=60).read().decode().splitlines():
    parts=line.split('\t');counties[parts[0]]=parts[1]
rows=[]
with zipfile.ZipFile(io.BytesIO(archive)) as z:
    for line in z.read('GB.txt').decode().splitlines():
        p=line.split('\t')
        if p[6]!='P' or (int(p[14] or 0)<500 and p[7] not in ('PPLC','PPLA','PPLA2','PPLA3')):continue
        rows.append({'id':p[0],'name':p[1],'region':{'ENG':'England','WLS':'Wales','SCT':'Scotland','NIR':'Northern Ireland'}.get(p[10],p[10]),'lat':float(p[4]),'lon':float(p[5]),'district':counties.get('GB.'+p[10]+'.'+p[11],''),'population':int(p[14] or 0)})
from collections import Counter
counts=Counter((p['name'],p['region']) for p in rows)
for p in rows:
    if counts[(p['name'],p['region'])]>1:p['label']=p['name']+', '+(p['district'] or ('near '+str(round(p['lat'],2))+', '+str(round(p['lon'],2))))+', '+p['region']
rows.sort(key=lambda p:-p['population'])
(root/'public/uk-places.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':'))+'\n')
print(f'Wrote {len(rows)} UK places. Attribution: GeoNames, CC BY 4.0. Not a street-address database.')
