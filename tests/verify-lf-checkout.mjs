// Cross-platform acceptance diagnostic. Run from any cwd with Node + Git installed.
// Copies the current nonignored working files, normalizes text to LF, then runs
// the actual suite. Runtime assets are copied byte-for-byte; no browser is used.
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync,readdirSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),temporaryRoot=path.resolve(tmpdir());
const destination=mkdtempSync(path.join(temporaryRoot,'faz-atlasi-lf-'));
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root}).toString('utf8').split('\0').filter(Boolean);
const textExtension=/\.(?:m?js|cjs|ts|json|html|css|md|txt|py|yml|yaml|svg|toml|lock)$/i;
let normalized=0;
try{
 for(const relative of new Set(files)){
  const input=path.resolve(root,relative),output=path.resolve(destination,relative);
  if(!input.startsWith(path.resolve(root)+path.sep)||!output.startsWith(destination+path.sep))throw new Error('Unsafe copy target');
  let bytes=readFileSync(input);
  if(textExtension.test(relative)||/(?:^|\/)(?:LICENSE|NOTICE|\.gitignore|\.gitattributes)$/.test(relative)){
   bytes=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'),'utf8');normalized++;
  }
  mkdirSync(path.dirname(output),{recursive:true});writeFileSync(output,bytes);
 }
 symlinkSync(path.join(root,'node_modules'),path.join(destination,'node_modules'),process.platform==='win32'?'junction':'dir');
 const tests=readdirSync(path.join(destination,'tests')).filter(name=>name.endsWith('.test.mjs')).map(name=>'tests/'+name);
 console.log(`LF-only working copy: ${files.length} files; ${normalized} text files normalized.`);
 execFileSync(process.execPath,['--test',...tests],{cwd:destination,stdio:'inherit'});
}finally{
 if(path.dirname(destination)!==temporaryRoot||!path.basename(destination).startsWith('faz-atlasi-lf-'))throw new Error('Unsafe cleanup target');
 rmSync(destination,{recursive:true,force:true});
}
