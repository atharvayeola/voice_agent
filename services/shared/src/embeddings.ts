/// <reference types="node" />
import { createHash } from "node:crypto";

export function hashEmbed(text: string, dimensions: number): number[] {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  const vector: number[] = [];
  let counter = 0;

  while (vector.length < dimensions) {
    const hash = createHash("sha256");
    hash.update(normalized);
    hash.update(String(counter));
    const digest = hash.digest();

    for (let i = 0; i < digest.length && vector.length < dimensions; i += 4) {
      const offset = Math.min(i, digest.length - 4);
      const chunk = digest.readInt32BE(offset);
      vector.push(chunk / 2_147_483_647); // normalize
    }

    counter += 1;
  }

  return vector.slice(0, dimensions);
}
