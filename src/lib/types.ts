export interface AuthAccount {
  id: string;
  name: string;
  issuer: string;
  secret: string;
  createdAt: number;
}

export interface QRCodeResult {
  data: string | null;
  error?: string;
} 