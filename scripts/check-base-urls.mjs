#!/usr/bin/env node
import { globby } from "globby";
import fs from "node:fs/promises";

const GLOBS = [
  "src/**/*.{js,jsx,ts,tsx,css,scss,html}",
  "public/**/*.{css,html,json,tmj,tsx,jsx,js}",
];

const IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.git/**",
  "**/*.map",
];

const PATTERNS = [
  { name: "CSS url() absoluto", regex: /url\((['"])\/[^)]+?\1\)/g },
  { name: "Atributo src= absoluto", regex: /\bsrc\s*=\s*(['"])\/[^"']*?\1/g },
  { name: "Atributo href= absoluto", regex: /\bhref\s*=\s*(['"])\/[^"']*?\1/g },
  { name: "Import/uso de asset absoluto", regex: /(['"])\/(?!\/|http)/g },
];

const ALLOWLIST = [
  /^href\s*=\s*["']\/\//,
  /^src\s*=\s*["']\/\//,
];

const FILE_ALLOW = [
  /utils\/assetPaths\.js$/,
  /utils\/baseUrl\.js$/,
];

const SNIPPET_ALLOW = [
  /data:image/i,
  /%3Csvg/i,
  /%3E%3C/i,
  /base\.endsWith/,
  /normalizedBase/,
  /getAbsoluteBaseUrl/,
  /window\.location/,
];

let errors = 0;

const files = await globby(GLOBS, { ignore: IGNORE });
for (const file of files) {
  if (FILE_ALLOW.some((rule) => rule.test(file))) {
    continue;
  }
  const text = await fs.readFile(file, "utf8");
  for (const { name, regex } of PATTERNS) {
    let match;
    while ((match = regex.exec(text))) {
      const line = text.slice(0, match.index).split("\n").length;
      const snippet = text.slice(match.index, match.index + 120).replace(/\n/g, " ");
      if (ALLOWLIST.some((rule) => rule.test(snippet))) {
        continue;
      }
      if (SNIPPET_ALLOW.some((rule) => rule.test(snippet))) {
        continue;
      }
      console.error(`[ABS-PATH] ${name} -> ${file}:${line}\n  ${snippet}\n`);
      errors += 1;
    }
  }
}

if (errors > 0) {
  console.error(`? Encontrados ${errors} usos absolutos. Troque por resolvePublicAsset(...) ou var(--...)\n`);
  process.exit(1);
}

console.log('? Nenhum path absoluto perigoso encontrado. Tudo certo com BASE_URL.');
