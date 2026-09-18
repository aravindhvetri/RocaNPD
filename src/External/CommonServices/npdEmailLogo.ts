import { Config } from "./Config";
import logoUrl from "../../webparts/rocaNpd/assets/RocaNewLogo.jpg";

export interface INpdEmailInlineAttachment {
  name: string;
  contentType: string;
  contentBytes: string;
  contentId: string;
}

let logoPromise: Promise<INpdEmailInlineAttachment | null> | undefined;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
}

export async function getRocaLogoInlineAttachment(): Promise<
  INpdEmailInlineAttachment | null
> {
  if (!logoPromise) {
    logoPromise = loadRocaLogoInlineAttachment();
  }

  return logoPromise;
}

async function loadRocaLogoInlineAttachment(): Promise<INpdEmailInlineAttachment | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      return null;
    }

    const contentBytes = arrayBufferToBase64(await response.arrayBuffer());
    return {
      name: "RocaNewLogo.jpg",
      contentType: "image/jpeg",
      contentBytes,
      contentId: Config.NpdEmail.LogoContentId,
    };
  } catch {
    return null;
  }
}
