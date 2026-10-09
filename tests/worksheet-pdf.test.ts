import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {PDFDocument,PDFArray,PDFDict,PDFName,PDFNumber,PDFRawStream,decodePDFRawStream} from 'pdf-lib';
import {worksheetImagePdf,worksheetPdfName} from '../src/worksheet-pdf';
import {runAccountAction} from '../src/page-access';

const identity={id:'ab12-cd34-ef56-7890',createdAt:1700000000000};
const jpeg=sharp({create:{width:56,height:79,channels:3,background:'#fffaf0'}}).jpeg().toBuffer();
const dataURL=(bytes:Buffer)=>'data:image/jpeg;base64,'+bytes.toString('base64');
function pending(){let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};}

type Matrix=[number,number,number,number,number,number];
function multiply(a:Matrix,b:Matrix):Matrix{
 return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
}
function imageDraws(content:string){
 let matrix:Matrix=[1,0,0,1,0,0],operands:string[]=[];
 const stack:Matrix[]=[],draws:{name:string;matrix:Matrix}[]=[];
 for(const token of content.trim().split(/\s+/)){
  if(token==='q'){stack.push([...matrix]);operands=[];}
  else if(token==='Q'){matrix=stack.pop()!;assert.ok(matrix,'balanced PDF graphics state');operands=[];}
  else if(token==='cm'){assert.equal(operands.length,6);const transform=operands.map(Number) as Matrix;assert.ok(transform.every(Number.isFinite));matrix=multiply(matrix,transform);operands=[];}
  else if(token==='Do'){assert.equal(operands.length,1);draws.push({name:operands[0],matrix:[...matrix]});operands=[];}
  else operands.push(token);
 }
 assert.equal(stack.length,0,'balanced PDF graphics state');
 return draws;
}

test('worksheet download is a valid one-page A4 PDF retaining and drawing the supplied JPEG',async()=>{
 const source=await jpeg,blob=await worksheetImagePdf(dataURL(source),identity);
 assert.equal(blob.type,'application/pdf');
 const bytes=new Uint8Array(await blob.arrayBuffer());
 assert.equal(Buffer.from(bytes.subarray(0,5)).toString('ascii'),'%PDF-');
 const pdf=await PDFDocument.load(bytes),pages=pdf.getPages();
 assert.equal(pages.length,1);
 const page=pages[0];
 assert.ok(Math.abs(page.getWidth()-210*72/25.4)<.02,'A4 width in PDF points');
 assert.ok(Math.abs(page.getHeight()-297*72/25.4)<.02,'A4 height in PDF points');
 const resources=page.node.Resources();assert.ok(resources);
 const images=resources.lookup(PDFName.of('XObject'),PDFDict).entries();
 assert.equal(images.length,1,'one embedded worksheet image');
 const [imageName,imageRef]=images[0],image=pdf.context.lookup(imageRef,PDFRawStream);
 assert.equal(image.dict.lookup(PDFName.of('Subtype'),PDFName).toString(),'/Image');
 assert.equal(image.dict.lookup(PDFName.of('Filter'),PDFName).toString(),'/DCTDecode');
 assert.equal(image.dict.lookup(PDFName.of('Width'),PDFNumber).asNumber(),56);
 assert.equal(image.dict.lookup(PDFName.of('Height'),PDFNumber).asNumber(),79);
 assert.deepEqual(Buffer.from(image.getContents()),source,'JPEG is embedded without alteration');
 const contents=page.node.Contents();assert.ok(contents);
 const streams=contents instanceof PDFArray?contents.asArray().map(ref=>pdf.context.lookup(ref,PDFRawStream)):[contents as PDFRawStream];
 const commands=streams.map(stream=>Buffer.from(decodePDFRawStream(stream).decode()).toString('ascii')).join('\n');
 const draws=imageDraws(commands);
 assert.equal(draws.length,1);assert.equal(draws[0].name,imageName.toString());
 const [a,b,c,d,x,y]=draws[0].matrix;
 assert.equal(b,0);assert.equal(c,0);assert.equal(x,0);assert.equal(y,0);
 assert.ok(Math.abs(a-page.getWidth())<.001,'image reaches both page edges horizontally');
 assert.ok(Math.abs(d-page.getHeight())<.001,'image reaches both page edges vertically');
 assert.equal(pdf.getTitle(),'소수 디펜스 · 오답 풀이 연습 학습지');
 assert.equal(pdf.getSubject(),'훈련서 AB12CD34');
 assert.equal(pdf.getCreationDate()?.getTime(),identity.createdAt);
});

test('PDF metadata and filename identify the selected saved worksheet',async()=>{
 const selected={id:'xy98-zt76-selected',createdAt:1700000001000};
 const pdf=await PDFDocument.load(await (await worksheetImagePdf(dataURL(await jpeg),selected)).arrayBuffer());
 assert.equal(pdf.getSubject(),'훈련서 XY98ZT76');
 assert.equal(pdf.getCreationDate()?.getTime(),selected.createdAt);
 assert.equal(worksheetPdfName(selected),'소수디펜스_학습지_XY98ZT76.pdf');
 assert.notEqual(worksheetPdfName(selected),worksheetPdfName(identity));
});

test('PDF filenames normalize worksheet identifiers and remove unsafe path characters',()=>{
 assert.equal(worksheetPdfName(identity),'소수디펜스_학습지_AB12CD34.pdf');
 assert.equal(worksheetPdfName({...identity,id:' AB12_/cD34:more*? '}),worksheetPdfName(identity));
 assert.equal(worksheetPdfName({...identity,id:'../\\:*?"<>|'}),'소수디펜스_학습지_WORKSHEET.pdf');
 for(const id of [identity.id,'short1','abc_def-123','a/b:c*d?e"f<g>h|i']){
  assert.match(worksheetPdfName({...identity,id}),/^소수디펜스_학습지_[A-Z0-9]+\.pdf$/);
 }
});

const preparationNames=['import','fonts','raster','PDF'];
for(const revokeAt of preparationNames.keys())test('logout during '+preparationNames[revokeAt]+' preparation prevents worksheet download',async()=>{
 let signedIn=true,downloads=0;
 const entered=pending(),release=pending(),calls:string[]=[];
 const preparations=preparationNames.map((name,index)=>async()=>{
  calls.push(name);if(index===revokeAt){entered.resolve();await release.promise;}
 });
 const saving=runAccountAction(()=>signedIn,preparations,()=>{downloads++;});
 await entered.promise;signedIn=false;release.resolve();
 assert.equal(await saving,false);assert.equal(downloads,0);
 assert.deepEqual(calls,preparationNames.slice(0,revokeAt+1),'later preparations stop after access is revoked');
});

test('authorized PDF download runs exactly once after all asynchronous preparations finish',async()=>{
 const entered=preparationNames.map(()=>pending()),release=preparationNames.map(()=>pending()),calls:string[]=[];
 let downloaded:Blob|undefined;
 const preparations=preparationNames.map((name,index)=>async()=>{
  calls.push(name);entered[index].resolve();await release[index].promise;
  if(name==='PDF')downloaded=await worksheetImagePdf(dataURL(await jpeg),identity);
 });
 const saving=runAccountAction(()=>true,preparations,()=>{assert.equal(downloaded?.type,'application/pdf');calls.push('download');});
 for(let index=0;index<preparationNames.length;index++){
  await entered[index].promise;
  assert.deepEqual(calls,preparationNames.slice(0,index+1),'download waits for the current preparation');
  release[index].resolve();
 }
 assert.equal(await saving,true);assert.deepEqual(calls,[...preparationNames,'download']);
});
