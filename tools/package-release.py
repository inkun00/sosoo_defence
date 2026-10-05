from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path.cwd()
out=root.parent/'output'/'decimal-defense'
out.mkdir(parents=True,exist_ok=True)
for name,items in [('소수의성_실행파일.zip',['dist','tools/serve.mjs','README.md','FIREBASE.md','게임실행.cmd','test-results/검증결과.txt']),('소수의성_원본코드.zip',['src','public','tests','tools','functions/src','functions/package.json','functions/package-lock.json','functions/tsconfig.json','functions/build.mjs','firebase.json','.firebaserc','firestore.rules','firestore.indexes.json','.env.example','.gitignore','package.json','package-lock.json','tsconfig.json','index.html','README.md','FIREBASE.md','게임실행.cmd'])]:
    with ZipFile(out/name,'w',ZIP_DEFLATED) as z:
        for item in items:
            p=root/item
            for f in (p.rglob('*') if p.is_dir() else [p]):
                if f.is_file(): z.write(f,f.relative_to(root).as_posix())
    with ZipFile(out/name) as z:
        assert 'tools/serve.mjs' in z.namelist()
        assert z.testzip() is None
        print(name.encode('ascii','backslashreplace').decode(),len(z.namelist()),(out/name).stat().st_size)
