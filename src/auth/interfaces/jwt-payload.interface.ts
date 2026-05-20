/**
 * Payload yang disimpan di dalam JWT access token.
 * Hanya simpan data minimal — jangan taruh data sensitif di sini.
 */
export interface JwtPayload {
  /** User ID (cuid dari Prisma) */
  sub: number;

  /** Email user */
  email: string;

  /** Role user: USER | MITRA | ADMIN */
  role: string;
}
