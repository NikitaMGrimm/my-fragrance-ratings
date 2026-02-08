import JSZip from 'jszip';
import { Perfume } from '../types';
import { perfumesToCSV } from './csvParser';
import { getCachedImageBlob } from './storage';

export const exportCollection = async (perfumes: Perfume[]) => {
  const zip = new JSZip();

  const csvString = perfumesToCSV(perfumes);
  zip.file("constants.csv", csvString);

  const imgFolder = zip.folder("images");
  if (imgFolder) {
    for (const p of perfumes) {
      if (p.pid && p.pid !== '0' && p.pid.trim() !== '') {
        try {
          let blob: Blob | null = null;
          let ext = 'jpg';
          
          const cachedBlob = await getCachedImageBlob(p.imageUrl);
          if (cachedBlob) {
             blob = cachedBlob;
             if (blob.type === 'image/png') ext = 'png';
             else if (blob.type === 'image/webp') ext = 'webp';
             else if (blob.type === 'image/jpeg') ext = 'jpg';
          } 
          
          if (!blob) {
              const extensions = ['jpg', 'jpeg', 'png', 'webp'];
              for (const e of extensions) {
                  try {
                      const resp = await fetch(`./images/${p.pid}.${e}`);
                      const contentType = resp.headers.get('content-type');
                      if (resp.ok && contentType && contentType.startsWith('image')) {
                          blob = await resp.blob();
                          ext = e;
                          break;
                      }
                    } catch (err) {
                  }
              }
          }

          if (blob) {
            imgFolder.file(`${p.pid}.${ext}`, blob);
          }

        } catch (e) {
          console.warn(`Failed to export image for ${p.name}`, e);
        }
      }
    }
  }

  try {
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "perfume-collection.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error("Failed to generate zip", e);
    alert("Error creating export zip.");
  }
};