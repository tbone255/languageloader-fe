// Offline rendering and gateway contract checks using actual React and TS sources.
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const ts=require(process.env.TYPESCRIPT_PATH||'typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function compile(file,mocks,append='') {const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};vm.runInNewContext(code+'\n'+append,{exports,require:id=>id in mocks?mocks[id]:require(id),console,process,fetch:async(...args)=>global.fetch(...args),AbortSignal});return exports;}
const mod=compile('src/pages/SourceLessonsPage.tsx',{'react-router-dom':{Link:({children,to})=>React.createElement('a',{href:to},children)},'../services/supabaseClient':{getAccessToken:async()=>'token'},'./SourceLessonsPage.css':{}},'exports.ComponentView=ComponentView;');
const evidence={text:'alpha',page:1,presentation:'ordinary'},example={source:evidence,translation:{...evidence,text:'first'},transliteration:null};
const fixtures=[
 {type:'explanation',text:'Supplied explanation',citations:[evidence]},
 {type:'example',example},
 {type:'comparison',caption:'Compare supplied forms',items:[{label:'First',example},{label:'Second',example:{...example,source:{...evidence,text:'beta'}}}]},
 {type:'reveal',prompt:'Show the source answer'},
 {type:'recall',prompt:'Recall the source answer'},
 {type:'selection',prompt:'Choose a supplied option',options:[{id:'opaque-a',text:'alpha'},{id:'opaque-b',text:'beta'}]},
 {type:'matching',prompt:'Match supplied content',left:[{id:'opaque-a',text:'alpha'},{id:'opaque-b',text:'beta'}],right:[{id:'opaque-c',text:'first'},{id:'opaque-d',text:'second'}]},
 {type:'cloze',prompt:'Recall the omitted word',before:'alpha ',after:'.'},
];
for(const [i,c] of fixtures.entries()){const html=renderToStaticMarkup(React.createElement(mod.ComponentView,{component:{...c,id:'c'+i},sessionId:'session',onPending:()=>{}}));assert.ok(html.includes(c.prompt||c.text||c.caption||'alpha'));if(['recall','reveal','cloze'].includes(c.type))assert.ok(!html.includes('beta'));}
const wrong=renderToStaticMarkup(React.createElement(mod.ComponentView,{component:{id:'wrong',type:'example',example:{...example,source:{...evidence,presentation:'explicit_error'}}},sessionId:'session',onPending:()=>{}}));assert.match(wrong,/Deliberately incorrect textbook example/);
const native=renderToStaticMarkup(React.createElement(mod.ComponentView,{component:{id:'native',type:'selection',prompt:'Choose',options:[{id:'x',text:'Native form',transliteration:{text:'Attested pronunciation'}}]},sessionId:'session',onPending:()=>{}}));
assert.match(native,/Native form/);assert.match(native,/<summary>Show transliteration<\/summary>/);assert.ok(native.indexOf('Native form')<native.indexOf('Attested pronunciation'));
const revealed=renderToStaticMarkup(React.createElement(mod.ComponentView,{component:{id:'recalled',type:'recall',prompt:'Recall',response:{feedback:'Explanation',answer:'Native answer',answer_item:{text:'Native answer',transliteration:{text:'Supplied pronunciation'}}}},sessionId:'session',onPending:()=>{}}));assert.match(revealed,/Supplied pronunciation/);
let handler;
const gateway=compile('server/sourceLessons.ts',{'./auth.js':{isAuthenticated:()=>{},currentUserId:()=> 'trusted-user'}});
gateway.registerSourceLessons({use:(_path,_auth,fn)=>{handler=fn;}});
(async()=>{const before={url:process.env.LL_PIPELINE_URL,key:process.env.LL_LEARNER_GATEWAY_KEY};process.env.LL_PIPELINE_URL='http://pipeline';process.env.LL_LEARNER_GATEWAY_KEY='test-key';let forwarded;
 const original=global.fetch;global.fetch=async(url,options)=>{forwarded={url,options};return {status:200,text:async()=>'[]'};};
 const res={code:0,status(code){this.code=code;return this;},type(){return this;},send(){},json(){}};
 try{await handler({path:'/lessons',method:'GET'},res);assert.equal(forwarded.url,'http://pipeline/api/v3/learner/lessons');assert.equal(forwarded.options.headers['X-LL-Learner'],'trusted-user');assert.equal(forwarded.options.headers['X-LL-Gateway-Key'],'test-key');
 forwarded=null;await handler({path:'/../../admin/jobs',method:'POST',body:{}},res);assert.equal(res.code,404);assert.equal(forwarded,null);
 console.log('All eight learner renderers, intentional-error labels and authenticated v3 gateway allowlist passed');
 }finally{global.fetch=original;for(const [key,value] of [['LL_PIPELINE_URL',before.url],['LL_LEARNER_GATEWAY_KEY',before.key]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
})().catch(err=>{console.error(err);process.exitCode=1;});
