import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer, request as httpRequest} from 'node:http';
import {createCatalogHttpHandler} from '../v2/catalog-http.mjs';

const OWNER='11111111-1111-4111-8111-111111111111';
const BRAND='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TOKEN='synthetic-owner-token';

async function postWhileRevoked(kind){
  let active=true,checks=0,writes=0,firstAuth;
  const authenticated=new Promise(resolve=>{firstAuth=resolve;});
  const payload=kind==='product'
    ?{brandId:BRAND,name:'Prueba ficticia',category:'food',priceCentavos:1200}
    :{name:'Marca ficticia'};
  const deps={
    authenticateBearer:async token=>{
      checks++;
      if(checks===1)firstAuth();
      return active&&token===TOKEN?{uid:OWNER}:null;
    },
    listProducts:async()=>[],
    createProduct:async(uid,draft)=>{
      writes++;
      return {id:'product-1',ownerUid:uid,...draft};
    },
    createBrand:async(uid,draft)=>{
      writes++;
      return {id:BRAND,ownerUid:uid,name:draft.name};
    }
  };
  const server=createServer(createCatalogHttpHandler(deps));
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  let client;
  try{
    const raw=JSON.stringify(payload);
    const split=raw.indexOf(':')+1;
    const result=new Promise((resolve,reject)=>{
      client=httpRequest({
        hostname:'127.0.0.1',port:server.address().port,
        path:'/v2/catalog/'+(kind==='product'?'products':'brands'),
        method:'POST',headers:{Authorization:'Bearer '+TOKEN,
          'Content-Type':'application/json'}
      },res=>{
        let body='';
        res.setEncoding('utf8');
        res.on('data',chunk=>{body+=chunk;});
        res.on('end',()=>{
          try{resolve({status:res.statusCode,body:JSON.parse(body)});}
          catch(error){reject(error);}
        });
        res.on('error',reject);
      });
      client.on('error',reject);
      client.setTimeout(3000,()=>client.destroy(new Error('HTTP timeout')));
      // Send headers and an incomplete JSON body. The server authenticates
      // before it can finish parsing the body; no external services are used.
      client.write(raw.slice(0,split));
    });
    await Promise.race([
      authenticated,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Auth was not reached')),3000))
    ]);
    active=false; // Revoked after first authentication, before write dispatch.
    client.end(raw.slice(split));
    const response=await result;
    assert.equal(response.status,401);
    assert.deepEqual(response.body,{error:'UNAUTHENTICATED'});
    assert.equal(writes,0,'Revoked identity must not reach the trusted write adapter');
    assert.equal(checks,2,'POST must verify the session again after reading the body');
  }finally{
    client?.destroy();
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
}

test('product POST rechecks revoked bearer after a delayed request body',async()=>{
  await postWhileRevoked('product');
});
test('brand POST rechecks revoked bearer after a delayed request body',async()=>{
  await postWhileRevoked('brand');
});
