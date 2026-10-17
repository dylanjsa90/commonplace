import ts from "typescript";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const dir = new URL("../outputs/tests/", import.meta.url);
await mkdir(dir,{recursive:true});
for (const name of ["summarizer","capture","password","session-token","url-import"]) {
  const source = await readFile(new URL(`../lib/${name}.ts`,import.meta.url),"utf8");
  const output = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace('"./summarizer"','"./summarizer.mjs"');
  await writeFile(new URL(`${name}.mjs`,dir),output);
}
const source = await readFile(new URL("../tests/core.test.mjs",import.meta.url),"utf8");
await writeFile(new URL("core.test.mjs",dir),source);
const authSource=await readFile(new URL("../tests/auth.test.mjs",import.meta.url),"utf8");
await writeFile(new URL("auth.test.mjs",dir),authSource);
await writeFile(new URL("import.test.mjs",dir),await readFile(new URL("../tests/import.test.mjs",import.meta.url),"utf8"));
const result = spawnSync(process.execPath,["--test",...(["core.test.mjs","auth.test.mjs","import.test.mjs"].map(n=>new URL(n,dir).pathname.replace(/^\/([A-Za-z]:)/,"$1")))],{stdio:"inherit"});
process.exit(result.status ?? 1);
