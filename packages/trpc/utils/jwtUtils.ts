import jwt, {JwtPayload} from "jsonwebtoken"
import "dotenv/config";

type payload = {
    sub: string
}

type TokenPayload = JwtPayload & {
  sub: string;
  type: "access" | "refresh";
};

const generateRefTok = (payload: payload) => {
    return jwt.sign({...payload, type: "refresh"}, process.env.JWT_REFRESH_SECRET!, {expiresIn: "30d"})
}

const generateAccTok = (payload: payload) => {
    return jwt.sign({...payload, type: "access"}, process.env.JWT_ACCESS_SECRET!, {expiresIn: "15m"})
}

const verifyAccTok = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as TokenPayload;
};

const verifyRefTok = (token: string): TokenPayload => {
  return  jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
};

export {
    generateAccTok,
    generateRefTok,
    verifyAccTok,
    verifyRefTok
}