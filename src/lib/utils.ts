import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const cosDeg = (deg: number) =>
  Math.round(Math.cos(deg * (Math.PI / 180)) * 1000) / 1000;

export const sinDeg = (deg: number) =>
  Math.round(Math.sin(deg * (Math.PI / 180)) * 1000) / 1000;
