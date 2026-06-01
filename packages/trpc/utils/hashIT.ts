import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashIT(password: string){
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a valid string");
  }

  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePass(plainPassword: string, hashedPassword: string): Promise<boolean> {
  if (!plainPassword || !hashedPassword) {
    throw new Error("Both password and hash are required");
  }

  return bcrypt.compare(plainPassword, hashedPassword);
}