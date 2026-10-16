// Exercise actual React section accumulation and disclosure preservation offline.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
(async()=>{
 const {Window}=await import(process.env.HAPPY_DOM_PATH||'happy-dom');const w=new Window({url:'http://localhost/source-lessons'});
 global.window=w;global.document=w.document;global.HTMLElement=w.HTMLElement;global.navigator=w.navigator;w.HTMLElement.prototype.scrollIntoView=function(){};
 const React=require('react'),{createRoot}=require('react-dom/client'),ts=require(process.env.TYPESCRIPT_PATH||'typescript');
 const evidence={text:'Native text',page:1,presentation:'ordinary'};
 const session={id:'session',lesson_id:'lesson',title:'A lesson',objectives:['Understand'],screens:[{id:'one',title:'First section',components:[{id:'example',type:'example',example:{source:evidence,translation:null,transliteration:{...evidence,text:'Pronunciation'}}}]},{id:'two',title:'Second section',components:[{id:'explanation',type:'explanation',text:'Another distinction',citations:[]}]}]};
 const code=ts.transpileModule(fs.readFileSync('src/pages/SourceLessonsPage.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={},mocks={'react-router-dom':{Link:({children,to})=>React.createElement('a',{href:to},children)},'../services/supabaseClient':{getAccessToken:async()=>'token'},'./SourceLessonsPage.css':{}};
 vm.runInNewContext(code,{exports,require:id=>id in mocks?mocks[id]:require(id),fetch:async url=>({ok:true,json:async()=>url.endsWith('/lessons')?[{id:'lesson',title:'A lesson',objectives:[],screens:2}]:session}),console});
 const root=createRoot(w.document.body);root.render(React.createElement(exports.default));const flush=async()=>{for(let i=0;i<30;i++)await new Promise(setImmediate);};await flush();
 const click=text=>{const b=[...w.document.querySelectorAll('button')].find(x=>x.textContent===text);assert.ok(b,text);b.click();};click('Start lesson');await flush();assert.equal(w.document.querySelectorAll('.lesson-section').length,1);
 w.document.querySelector('details').open=true;click('Continue');await flush();assert.equal(w.document.querySelectorAll('.lesson-section').length,2);assert.equal(w.document.querySelector('details').open,true);assert.equal(w.document.activeElement.textContent,'Second section');
 click('Finish lesson');await flush();assert.equal(w.document.querySelectorAll('.lesson-section').length,2);assert.match(w.document.body.textContent,/End of lesson/);
 root.unmount();await w.happyDOM.close();console.log('Learner sections accumulate, disclosures persist, and heading focus follows Continue');
})().catch(e=>{console.error(e);process.exitCode=1;});
