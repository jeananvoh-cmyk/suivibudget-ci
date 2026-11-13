import React from 'react';
import { generateQrMatrix } from '../../utils/qrCode';

interface QrCodeSvgProps {
  value: string;
  size?: number;
  label?: string;
  className?: string;
  quietZone?: number;
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({
  value,
  size = 96,
  label,
  className = '',
  quietZone = 4,
}) => {
  const qr = React.useMemo(() => generateQrMatrix(value), [value]);
  const totalSize = qr.size + quietZone * 2;

  const pathData = React.useMemo(() => {
    const parts: string[] = [];
    for (let r = 0; r < qr.size; r++) {
      for (let c = 0; c < qr.size; c++) {
        if (qr.modules[r][c]) {
          parts.push(`M${c + quietZone},${r + quietZone}h1v1h-1z`);
        }
      }
    }
    return parts.join('');
  }, [qr, quietZone]);

  return (
    <svg
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label || `QR Code pointant vers ${value}`}
      className={`bg-white rounded-lg ${className}`}
    >
      <rect width={totalSize} height={totalSize} fill="#ffffff" />
      <path d={pathData} fill="#0f172a" />
    </svg>
  );
};
