import { useEffect, useRef, useState } from 'react';
import { Modal, Button, Typography, Alert } from 'antd';
import { QrcodeOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (assetId: string) => void;
  buttonText?: string;
  buttonType?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
  buttonSize?: 'small' | 'middle' | 'large';
}

export default function QrScanner({ onScan, buttonText = 'Scan QR', buttonType = 'primary', buttonSize = 'middle' }: QrScannerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>('qr-reader-' + Math.random().toString(36).slice(2));

  const startScanner = async () => {
    setError('');
    try {
      const scanner = new Html5Qrcode(containerRef.current);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopScanner();
          setOpen(false);
          onScan(decodedText.trim());
        },
        () => {},
      );
    } catch (err: any) {
      setError(err?.message || 'Camera access denied or not available');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    scannerRef.current = null;
  };

  useEffect(() => {
    if (open) {
      setTimeout(startScanner, 300);
    }
    return () => stopScanner();
  }, [open]);

  return (
    <>
      <Button type={buttonType} size={buttonSize} icon={<QrcodeOutlined />} onClick={() => setOpen(true)}>
        {buttonText}
      </Button>
      <Modal
        title={<><QrcodeOutlined style={{ marginRight: 8 }} />Scan Machine QR Code</>}
        open={open}
        onCancel={() => { stopScanner(); setOpen(false); }}
        footer={null}
        width={400}
        destroyOnClose
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          Point your camera at the machine's QR code label
        </Typography.Text>
        {error && <Alert type="error" message={error} style={{ marginBottom: 12 }} showIcon />}
        <div id={containerRef.current} style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }} />
      </Modal>
    </>
  );
}
