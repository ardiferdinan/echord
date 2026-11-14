// Accounts: username (+ optional email) and a scrypt password hash. Only the super admin creates accounts.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const db = () => neon(process.env.DATABASE_URL!);

export type Role = "superadmin" | "member";
export type User = { id: number; username: string; email: string | null; role: Role; created_at: string };

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await scrypt(pw, salt, 64)).toString("hex")}`;
}
export async function verifyPassword(pw: string, stored: string) {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const got = await scrypt(pw, Buffer.from(salt, "hex"), 64);
  return timingSafeEqual(got, Buffer.from(hash, "hex"));
}

/** Tables live here so a fresh database works on first login (same statements as db/schema.sql). */
export async function ensureTables() {
  const sql = db();
  await sql`create table if not exists users (
    id serial primary key, username text unique not null, email text unique, password_hash text not null,
    role text not null default 'member', created_at timestamptz not null default now())`;
  await sql`create table if not exists user_setlists (
    user_id int primary key references users(id) on delete cascade, data jsonb not null default '[]', updated_at timestamptz not null default now())`;
}

export async function userCount() {
  return Number(((await db()`select count(*) from users`) as { count: string }[])[0].count);
}
export async function getUser(id: number): Promise<User | undefined> {
  return ((await db()`select id, username, email, role, created_at from users where id = ${id}`) as User[])[0];
}
/** Login by username or email (case-insensitive). */
export async function findLogin(login: string): Promise<(User & { password_hash: string }) | undefined> {
  const l = login.trim().toLowerCase();
  return ((await db()`select * from users where lower(username) = ${l} or lower(email) = ${l}`) as (User & { password_hash: string })[])[0];
}
export async function listUsers(): Promise<User[]> {
  return (await db()`select id, username, email, role, created_at from users order by role = 'superadmin' desc, lower(username)`) as User[];
}

export const USERNAME = /^[a-z0-9._-]{3,32}$/;
export const cleanEmail = (e: string) => {
  const v = e.trim().toLowerCase();
  if (!v) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length > 200) throw new Error("Email tidak valid.");
  return v;
};
export const checkPassword = (pw: string) => {
  if (pw.length < 8) throw new Error("Password minimal 8 karakter.");
  if (pw.length > 200) throw new Error("Password terlalu panjang.");
};

export async function createUser(u: { username: string; email: string | null; password: string; role: Role }) {
  const username = u.username.trim().toLowerCase();
  if (!USERNAME.test(username)) throw new Error("Username 3–32 karakter: huruf kecil, angka, titik, minus atau garis bawah.");
  checkPassword(u.password);
  try {
    const rows = (await db()`insert into users (username, email, password_hash, role) values (${username}, ${u.email}, ${await hashPassword(u.password)}, ${u.role}) returning id`) as { id: number }[];
    return rows[0].id;
  } catch (e) {
    if (/unique/i.test((e as Error).message)) throw new Error("Username atau email sudah dipakai.");
    throw e;
  }
}
export async function setPassword(id: number, pw: string) {
  checkPassword(pw);
  await db()`update users set password_hash = ${await hashPassword(pw)} where id = ${id}`;
}
export async function setEmail(id: number, email: string | null) {
  try {
    await db()`update users set email = ${email} where id = ${id}`;
  } catch (e) {
    if (/unique/i.test((e as Error).message)) throw new Error("Email sudah dipakai akun lain.");
    throw e;
  }
}
export async function deleteUser(id: number) {
  await db()`delete from users where id = ${id} and role <> 'superadmin'`;
}

// ---------- setlists, one JSON document per account ----------
export async function getSetlists(userId: number): Promise<{ data: unknown[]; updatedAt: string | null }> {
  const r = ((await db()`select data, updated_at from user_setlists where user_id = ${userId}`) as { data: unknown[]; updated_at: string }[])[0];
  return { data: r?.data ?? [], updatedAt: r?.updated_at ?? null };
}
export async function saveSetlists(userId: number, data: unknown[]) {
  await db()`insert into user_setlists (user_id, data, updated_at) values (${userId}, ${JSON.stringify(data)}::jsonb, now())
    on conflict (user_id) do update set data = excluded.data, updated_at = now()`;
}
