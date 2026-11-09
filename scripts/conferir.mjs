// Contraprova: confere cada etapa da fonte da verdade (docs/fonte-da-verdade.json) contra o código real.
// Uso: node scripts/conferir.mjs [idDaEtapa] [--rapido] [--registrar]
//   --rapido     pula os checks que rodam comandos (tsc, vitest, build)
//   --registrar  grava o resultado em docs/CONTRAPROVA.md
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const rapido = args.includes("--rapido");
const registrar = args.includes("--registrar");
const filtro = args.find((a) => /^\d+$/.test(a));
const fonte = JSON.parse(readFileSync("docs/fonte-da-verdade.json", "utf8"));
const cacheCmd = new Map();

function rodar(cmd) {
  if (!cacheCmd.has(cmd)) {
    try {
      execSync(cmd, { stdio: "pipe", timeout: 600000 });
      cacheCmd.set(cmd, true);
    } catch {
      cacheCmd.set(cmd, false);
    }
  }
  return cacheCmd.get(cmd);
}

function checar(c) {
  switch (c.tipo) {
    case "arquivo":
      return existsSync(c.arquivo);
    case "contem":
      return existsSync(c.arquivo) && new RegExp(c.regex).test(readFileSync(c.arquivo, "utf8"));
    case "naoContem":
      return existsSync(c.arquivo) && !new RegExp(c.regex).test(readFileSync(c.arquivo, "utf8"));
    case "comando":
      return rapido ? null : rodar(c.cmd);
    default:
      throw new Error(`tipo de check desconhecido: ${c.tipo}`);
  }
}

let divergencia = false;
const linhas = [];
for (const e of fonte.etapas) {
  if (filtro !== undefined && String(e.id) !== filtro) continue;
  const res = e.checks.map((c) => ({ ...c, ok: checar(c) }));
  const especificos = res.filter((r) => r.tipo !== "comando");
  const feitos = especificos.filter((r) => r.ok === true).length;
  const pulados = res.filter((r) => r.ok === null).length;
  const falhas = res.filter((r) => r.ok === false);
  const real = falhas.length === 0 && pulados === 0 ? "concluida" : falhas.length === 0 ? "sem-comandos" : "pendente";
  const erro = e.status === "concluida" && falhas.length > 0;
  if (erro) divergencia = true;
  const veredito = erro ? "DIVERGENTE (declarada concluída, mas falha)" : e.status === "concluida" ? "OK" : real === "concluida" ? "PRONTA PARA MARCAR COMO CONCLUÍDA" : "pendente";
  console.log(`\nEtapa ${e.id} — ${e.titulo}  [declarada: ${e.status}]  ${feitos}/${especificos.length} checks da etapa + ${res.length - especificos.length} comandos de segurança  → ${veredito}`);
  for (const r of res) console.log(`  ${r.ok === true ? "✔" : r.ok === null ? "·" : "✘"} ${r.d}`);
  linhas.push({ e, feitos, total: especificos.length, pulados, veredito, falhas });
}

if (registrar) {
  const hoje = new Date().toISOString().slice(0, 16).replace("T", " ");
  let md = `# Contraprova\n\nGerado por \`node scripts/conferir.mjs --registrar\` em ${hoje} UTC${rapido ? " (modo rápido: comandos não executados)" : ""}.\n\n| Etapa | Declarada | Checks da etapa | Resultado |\n| --- | --- | --- | --- |\n`;
  for (const l of linhas) md += `| ${l.e.id} — ${l.e.titulo} | ${l.e.status} | ${l.feitos}/${l.total}${l.pulados ? ` (${l.pulados} pulados)` : ""} | ${l.veredito} |\n`;
  const abertos = linhas.filter((l) => l.falhas.length);
  if (abertos.length) {
    md += `\n## O que falta\n`;
    for (const l of abertos) md += `\n**Etapa ${l.e.id} — ${l.e.titulo}**\n${l.falhas.map((f) => `- ${f.d}`).join("\n")}\n`;
  }
  writeFileSync("docs/CONTRAPROVA.md", md);
  console.log("\nRegistrado em docs/CONTRAPROVA.md");
}

process.exit(divergencia ? 1 : 0);
