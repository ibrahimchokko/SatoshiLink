'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { qrValue } from './QRBlock';
import { formatSats, truncate } from '@/lib/format';

interface Props {
  id: string;
  paymentRequest: string;
  amountSat: number;
  description?: string;
  className?: string;
}

const W = 600;
const PAD = 48;
const QR = W - PAD * 2;

/**
 * Shares the invoice QR as a branded PNG via the Web Share API (phones), or downloads it
 * where sharing files isn't supported (most desktop browsers).
 */
export function ShareQRButton({ id, paymentRequest, amountSat, description, className = 'btn-secondary' }: Props) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);

  // Build the image before the click: Safari drops the user gesture if navigator.share waits on async work.
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled || !qrRef.current) return;
      composeImage(qrRef.current, amountSat, description).toBlob(blob => {
        if (!cancelled && blob) setFile(new File([blob], `satoshilink-${id}.png`, { type: 'image/png' }));
      }, 'image/png');
    });
    return () => {
      cancelled = true;
    };
  }, [id, paymentRequest, amountSat, description]);

  async function share() {
    if (!file) return;
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Lightning invoice — ${formatSats(amountSat)}` });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return; // user closed the share sheet
        console.warn('Share failed, downloading QR instead', e);
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <>
      <QRCodeCanvas ref={qrRef} value={qrValue(paymentRequest)} size={QR} marginSize={0} level="M" className="hidden" />
      <button type="button" onClick={share} disabled={!file} className={className}>
        {saved ? 'Saved ✓' : 'Share QR image'}
      </button>
    </>
  );
}

function composeImage(qr: HTMLCanvasElement, amountSat: number, description?: string) {
  const H = PAD + 30 + 28 + QR + 36 + 44 + (description ? 36 : 0) + 22 + PAD;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const font = getComputedStyle(document.body).fontFamily;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let y = PAD;

  ctx.fillStyle = '#F7931A';
  ctx.font = `700 30px ${font}`;
  ctx.fillText('SatoshiLink', W / 2, y);
  y += 30 + 28;

  ctx.drawImage(qr, PAD, y, QR, QR);
  y += QR + 36;

  ctx.fillStyle = '#0f172a';
  ctx.font = `800 40px ${font}`;
  ctx.fillText(formatSats(amountSat), W / 2, y);
  y += 44;

  if (description) {
    ctx.fillStyle = '#475569';
    ctx.font = `400 24px ${font}`;
    ctx.fillText(truncate(description, 44), W / 2, y, QR);
    y += 36;
  }

  ctx.fillStyle = '#94a3b8';
  ctx.font = `400 18px ${font}`;
  ctx.fillText('Scan with any Lightning wallet to pay', W / 2, y);

  return canvas;
}
