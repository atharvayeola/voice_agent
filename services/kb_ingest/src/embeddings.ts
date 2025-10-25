import crypto from "node:crypto";

export function hashEmbed(text: string, dimensions: number): number[] {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  const hashes: number[] = [];
  let counter = 0;

  while (hashes.length < dimensions) {
    const hash = crypto.createHash("sha256");
    hash.update(normalized);
    hash.update(String(counter));
    const digest = hash.digest();

    for (let i = 0; i < digest.length && hashes.length < dimensions; i += 4) {
      const offset = Math.min(i, digest.length - 4);
      const chunk = digest.readInt32BE(offset);
      hashes.push(chunk / 2_147_483_647); // scale to roughly [-1,1]
    }

    counter += 1;
  }

  return hashes.slice(0, dimensions);
}
