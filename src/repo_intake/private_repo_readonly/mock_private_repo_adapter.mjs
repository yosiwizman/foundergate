// W6b — Mock Private Repo Adapter (LOCAL / SYNTHETIC). Read-only methods only. No network, no write, no provider.
export function makeMockPrivateRepo(){
  const files=[
    {path:'README.md',bytes:120,binary:false,sample:'# demo synthetic repo'},
    {path:'src/index.js',bytes:200,binary:false,sample:'console.log("hi")'},
    {path:'.env',bytes:60,binary:false,sample:'API_KEY=sk-FAKESYNTH1234567890abcdef'},
    {path:'config/production.config.json',bytes:80,binary:false,sample:'{"prod":true}'},
    {path:'certs/server.pem',bytes:1400,binary:false,sample:'-----BEGIN PRIVATE KEY-----FAKE'},
    {path:'data/customers.csv',bytes:400,binary:false,sample:'name,ssn\nJohn,123-45-6789'},
    {path:'assets/logo.png',bytes:2*1024*1024,binary:true},
    {path:'../evil.txt',bytes:10,binary:false},
    {path:'linky',bytes:0,symlink:true},
  ];
  return {
    __synthetic:true, __commit:'a1b2c3d4e5f6',
    getRepoMetadata:()=>({full_name:'synthetic-owner/synthetic-private-repo',private:true,default_branch:'main',synthetic:true}),
    getArchiveManifest:()=>({commit:'a1b2c3d4e5f6',files}),
    getFileMetadata:(p)=>files.find(f=>f.path===p)||null,
    listCommitsReadonly:()=>[{sha:'a1b2c3d4e5f6',synthetic:true}],
    // NO push/commit/write/exec/provider methods exist.
  };
}
