import jwt, { JwtPayload } from "jsonwebtoken";
import "dotenv/config";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "default-access-secret-key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default-refresh-secret-key";

export interface TokenPayload extends JwtPayload {
  sub: string;
  type: "access" | "refresh";
}

interface UserPayload {
  sub: string;
}

export const generateRefTok = (payload: UserPayload): string => {
  return jwt.sign({ ...payload, type: "refresh" }, JWT_REFRESH_SECRET, { expiresIn: "30d" });
};

export const generateAccTok = (payload: UserPayload): string => {
  return jwt.sign({ ...payload, type: "access" }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
};

export const verifyAccTok = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
};

export const verifyRefTok = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
};
