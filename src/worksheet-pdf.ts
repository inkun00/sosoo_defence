import {toSvg} from 'html-to-image';
import {PDFDocument,PageSizes} from 'pdf-lib';
import type {Worksheet} from './worksheet';

type WorksheetIdentity=Pick<Worksheet,'id'|'createdAt'>;
const shortId=(sheet:WorksheetIdentity)=>sheet.id.replace(/[^a-z0-9]/gi,'').slice(0,8).toUpperCase()||'WORKSHEET';
export function worksheetPdfName(sheet:WorksheetIdentity){return '소수디펜스_학습지_'+shortId(sheet)+'.pdf';}

export async function worksheetImagePdf(jpeg:string,sheet:WorksheetIdentity):Promise<Blob>{
 const pdf=await PDFDocument.create();
 pdf.setTitle('소수 디펜스 · 오답 풀이 연습 학습지');
 pdf.setSubject('훈련서 '+shortId(sheet));
 pdf.setCreator('소수 디펜스');
 pdf.setCreationDate(new Date(sheet.createdAt));
 const image=await pdf.embedJpg(jpeg),page=pdf.addPage(PageSizes.A4);
 page.drawImage(image,{x:0,y:0,width:page.getWidth(),height:page.getHeight()});
 return new Blob([Uint8Array.from(await pdf.save()).buffer],{type:'application/pdf'});
}

export async function worksheetPageImage(page:HTMLElement):Promise<string>{
 const {width,height}=page.getBoundingClientRect();
 const snapshot=page.cloneNode(true) as HTMLElement,holder=document.createElement('div');
 holder.className='workbook';holder.inert=true;holder.setAttribute('aria-hidden','true');
 holder.style.cssText='position:fixed;left:-10000px;top:0;width:210mm;padding:0;min-height:0;pointer-events:none';
 holder.append(snapshot);document.body.append(holder);
 try{
  // The renderer silently ignores failed background fetches. Embed verified
  // artwork ourselves so a failed request cannot create an incomplete PDF.
  await Promise.all(['.ws-guide','.ws-egg'].map(async selector=>{
   const source=page.querySelector<HTMLElement>(selector),target=snapshot.querySelector<HTMLElement>(selector);
   const url=source&&getComputedStyle(source).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
   if(!target||!url)throw Error('학습지 그림을 찾지 못했어요.');
   const response=await fetch(url,{cache:'force-cache'});if(!response.ok)throw Error('학습지 그림을 불러오지 못했어요.');
   const blob=await response.blob(),data=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
   });
   const artwork=new Image();artwork.src=data;await artwork.decode();target.style.backgroundImage='url("'+data+'")';
  }));
  const svg=await toSvg(snapshot,{width,height,backgroundColor:'#fffaf0',
   // The worksheet uses system fonts. Avoid embedding unrelated game webfonts.
   fontEmbedCSS:'',style:{boxShadow:'none',margin:'0',transform:'none'}});
  // Rasterize without requestAnimationFrame so switching tabs cannot stall a save.
  const image=new Image();image.src=svg;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(width*2);canvas.height=Math.ceil(height*2);
  const context=canvas.getContext('2d');if(!context)throw Error('PDF 이미지를 만들 수 없어요.');
  context.fillStyle='#fffaf0';context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',.96);
 }finally{holder.remove();}
}

export function downloadWorksheetPdf(blob:Blob,sheet:WorksheetIdentity){
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=worksheetPdfName(sheet);document.body.append(link);
 try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
}
