'use client';

import { QRCodeSVG } from 'qrcode.react';

/** BOLT11 is case-insensitive; uppercase gives a denser, easier-to-scan QR (alphanumeric mode). */
export function QRBlock({ paymentRequest, dimmed }: { paymentRequest: string; dimmed?: boolean }) {
  return (
    <div className={`mx-auto w-fit rounded-2xl border border-slate-200 bg-white p-4 transition ${dimmed ? 'opacity-25 grayscale' : ''}`}>
      <QRCodeSVG value={`lightning:${paymentRequest}`.toUpperCase()} size={232} marginSize={0} level="M" />
    </div>
  );
}
