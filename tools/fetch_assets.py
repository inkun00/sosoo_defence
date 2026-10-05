import urllib.request,re,json,pathlib,zipfile,shutil
root=pathlib.Path(__file__).resolve().parents[1]
assets=root/'public'/'assets';assets.mkdir(parents=True,exist_ok=True)
url='https://kenney.nl/assets/tower-defense-top-down'
html=urllib.request.urlopen(url).read().decode()
links=re.findall(r'(?:href|data-url)=[\"\']([^\"\']+)',html)
print('downloads',*[x for x in links if '.zip' in x],sep='\n')
for x in links:
    if '.zip' in x:
        src=x if x.startswith('http') else 'https://kenney.nl'+x
        data=urllib.request.urlopen(src).read();(assets/'kenney.zip').write_bytes(data)
        with zipfile.ZipFile(assets/'kenney.zip') as z:z.extractall(assets/'kenney')
        break
tree=json.load(urllib.request.urlopen('https://api.github.com/repos/m-ko-de/open-td/git/trees/main?recursive=1'))
print('reference files',*[x['path'] for x in tree.get('tree',[]) if any(s in x['path'].lower() for s in ['towermanager','pathfind','license'])],sep='\n')
