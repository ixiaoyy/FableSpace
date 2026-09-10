import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {access,chmod,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(app,'../..');
const project=path.join(app,'godot');
const runtime=path.join(root,'artifacts/godot-runtime');
const lock=JSON.parse(await readFile(path.join(project,'engine-lock.json'),'utf8'));
const version=lock.version.replace('-stable','');
const executable=path.join(runtime,version,`Godot_v${lock.version}_${process.platform==='win32'?'win64_console.exe':'linux.x86_64'}`);
const action=process.argv[2]??'check';

/** 执行有总时限的工具，保留错误输出；不经过 shell 插值。 */
function execute(binary,args,timeout=180000){
  const result=spawnSync(binary,args,{cwd:app,encoding:'utf8',windowsHide:true,timeout,maxBuffer:12*1024*1024});
  if(result.stdout)process.stdout.write(result.stdout);
  if(result.stderr)process.stderr.write(result.stderr);
  if(result.error||result.status!==0||/SCRIPT ERROR:|^ERROR:/m.test((result.stdout??'')+(result.stderr??'')))throw new Error(`工具执行失败：${path.basename(binary)}（${result.status}）`);
}

/** 流式核对大归档，避免把整套导出模板读入内存。 */
async function digest(file,algorithm){
  const hash=createHash(algorithm);
  for await(const chunk of createReadStream(file))hash.update(chunk);
  return hash.digest('hex');
}

/** 下载固定来源并核对锁定哈希，失败文件下次只能校验后重用。 */
async function download(url,name,algorithm,expected){
  const target=path.join(runtime,name);
  let valid=false;
  try{valid=await digest(target,algorithm)===expected;}catch{}
  if(!valid)execute('curl',['--fail','--silent','--show-error','--location','--connect-timeout','15','--max-time','480','--output',target,url],500000);
  if(await digest(target,algorithm)!==expected)throw new Error(`校验失败：${name}`);
  return target;
}

/** Linux 构建使用官方标准版和同一锁文件；解压前检查归档没有绝对或父级路径。 */
function extract(archive,destination,files=[]){
  const listed=spawnSync('unzip',['-Z1',archive],{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
  if(listed.status!==0)throw new Error('无法读取归档');
  for(const entry of listed.stdout.split('\n').filter(Boolean))if(entry.startsWith('/')||entry.split('/').includes('..'))throw new Error('归档包含越界路径');
  execute('unzip',['-o',...(files.length?['-j']:[]),archive,...files,'-d',destination]);
}

if(action==='setup'){
  if(process.platform==='win32')execute('powershell.exe',['-NoProfile','-File',path.join(app,'scripts/setup-godot.ps1')],600000);
  else if(process.platform==='linux'){
    if(process.arch!=='x64')throw new Error('当前固定的 Linux 构建工具链仅支持 x86_64。');
    await mkdir(runtime,{recursive:true});
    const engine=await download(`https://downloads.godotengine.org/?flavor=stable&platform=linux.64&slug=linux.x86_64.zip&version=${version}`,lock.linux_archive,'sha512',lock.linux_sha512);
    extract(engine,path.join(runtime,version)); await chmod(executable,0o755);
    const addon=await download(lock.yati.url,'yati-v2.2.7-gdscript.zip','sha256',lock.yati.sha256);
    extract(addon,path.join(runtime,'yati-v2.2.7'));
    await download(lock.font.url,'NotoSansCJKsc-Regular.otf','sha256',lock.font.sha256);
    execute('curl',['--fail','--silent','--show-error','--location','--connect-timeout','15','--max-time','30','--output',path.join(runtime,'NotoSansCJK-LICENSE.txt'),lock.font.license_url]);
    const templates=await download(`https://downloads.godotengine.org/?flavor=stable&platform=templates&slug=export_templates.tpz&version=${version}`,lock.templates_archive,'sha512',lock.templates_sha512);
    extract(templates,path.join(runtime,'templates'),['templates/web_nothreads_debug.zip','templates/web_nothreads_release.zip','templates/windows_debug_x86_64.exe','templates/windows_release_x86_64.exe']);
  }else throw new Error('当前构建脚本支持 Windows 与 Linux；macOS 工具链需单独接入。');
}else if(['check','web','windows','run','editor','parity','energy','fishing'].includes(action)){
  try{await access(executable);}catch{throw new Error('请先运行 npm run godot:setup 准备固定版本引擎。');}
  if(action==='check'){
    execute(executable,['--headless','--editor','--path',project,'--import']);
    execute(executable,['--headless','--path',project,'--quit-after','120']);
  }else if(action==='web'||action==='windows'){
    await mkdir(path.join(project,'exports',action),{recursive:true});
    execute(executable,['--headless','--path',project,'--export-release',action==='web'?'Web':'Windows']);
  }else if(action==='parity')execute(executable,['--headless','--path',project,'--script','res://tools/validate_migration.gd','--quit-after','300']);
  else if(action==='energy')execute(executable,['--headless','--path',project,'--script','res://tools/validate_energy.gd','--max-fps','60','--quit-after','900']);
  else if(action==='fishing')execute(executable,['--headless','--path',project,'--script','res://tools/validate_fishing_skill.gd','--quit-after','300']);
  else{
    const child=spawn(executable,[...(action==='editor'?['--editor']:[]),'--path',project],{cwd:app,stdio:'inherit',windowsHide:true});
    child.on('error',error=>{process.stderr.write(error.message);process.exitCode=1;});
    child.on('exit',code=>{process.exitCode=code??1;});
  }
}else if(action==='serve'){
  await access(path.join(project,'exports/web/index.html'));
  const child=spawn(process.platform==='win32'?'python':'python3',['-m','http.server','8080','--bind','127.0.0.1','--directory',path.join(project,'exports/web')],{stdio:'inherit',windowsHide:true});
  child.on('error',error=>{process.stderr.write(error.message);process.exitCode=1;});
  child.on('exit',code=>{process.exitCode=code??1;});
}else throw new Error(`未知 Godot 操作：${action}`);
