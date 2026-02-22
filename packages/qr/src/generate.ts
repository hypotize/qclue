import QRCode from "qrcode";

export type QrOptions = {
  foreground?: string;
  background?: string;
  /** Physical size in mm for print sizing reference */
  sizeMm?: number;
};

/** Returns a PNG buffer of the QR code for the given data string. */
export async function generateQrBuffer(
  data: string,
  options: QrOptions = {}
): Promise<Buffer> {
  const { foreground = "#000000", background = "#ffffff" } = options;

  const buffer = await QRCode.toBuffer(data, {
    errorCorrectionLevel: "M",
    type: "png",
    color: {
      dark: foreground,
      light: background,
    },
    // 2cm at 300dpi ≈ 236px; use margin=1 to keep it compact
    width: 236,
    margin: 1,
  });

  return buffer;
}
