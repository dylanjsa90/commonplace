import ts from "typescript";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const dir = new URL("../outputs/tests/", import.meta.url);
await mkdir(dir,{recursive:true});
for (const name of ["summarizer","capture"]) {
  const source = await readFile(new URL(`../lib/${name}.ts`,import.meta.url),"utf8");
  const output = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace('"./summarizer"','"./summarizer.mjs"');
  await writeFile(new URL(`${name}.mjs`,dir),output);
}
const source = await readFile(new URL("../tests/core.test.mjs",import.meta.url),"utf8");
await writeFile(new URL("core.test.mjs",dir),source);
const result = spawnSync(process.execPath,["--test",new URL("core.test.mjs",dir).pathname.replace(/^\/([A-Za-z]:)/,"$1")],{stdio:"inherit"});
process.exit(result.status ?? 1);
