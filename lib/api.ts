export type User = { id: string; name: string; role: 'doctor' | 'parent'; email: string };
export type Child = { id: string; name: string; dob: string; sex: string; allergies: string; parent_name: string };
export type Appointment = { id: string; child_id: string; child_name: string; parent_name: string; dob: string; day: string; time: string; type: string; reason: string; status: 'scheduled' | 'checked-in' | 'completed' | 'cancelled' };
export type Records = { notes: { id: string; body: string; created: string }[]; vaccines: { id: string; name: string; due: string; administered: string | null }[] };
export type Brief = { title: string; disclaimer: string; sections: {label: string; text: string}[]; source: string };
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch('/api' + path, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Unable to connect. Please try again.');
  return body;
}
export const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
export const dateLabel = (v: string) => new Date(v.slice(0,10) + 'T12:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
export const timeLabel = (v: string) => `${Number(v.slice(0,2)) % 12 || 12}:${v.slice(3)} ${Number(v.slice(0,2)) >= 12 ? 'PM' : 'AM'}`;
export function age(dob: string) { const d = new Date(dob), t = new Date(today()); let months = (t.getFullYear()-d.getFullYear())*12+t.getMonth()-d.getMonth(); if(t.getDate()<d.getDate()) months--; return months < 12 ? `${Math.max(0,months)} mo` : `${Math.floor(months/12)} yr${months%12 ? ` ${months%12} mo` : ''}`; }
