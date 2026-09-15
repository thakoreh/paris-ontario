import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
import crypto from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const profile=await mkdtemp(path.join(os.tmpdir(),'parispulse-push-qa-'));
const base=process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3023';
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const email=`parispulse-qa-${crypto.randomUUID()}@example.com`,password=crypto.randomBytes(24).toString('base64url');
let id,browser;
try {
 const result=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Temporary QA account'}});
 if(result.error) throw new Error(result.error.message);
 id=result.data.user.id;
 browser=await chromium.launchPersistentContext(profile,{headless:process.env.PUSH_HEADED !== '1',channel:'chrome',permissions:['notifications']});
 const context=browser;
 const page=await context.newPage();
 await page.goto(base+'/login');
 await page.getByLabel('Email address').fill(email);
 await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.waitForURL('**/app',{timeout:25000});
 console.log('PASS: real password sign-in redirects to app.');
 await page.goto(base+'/notifications');
 await page.getByRole('button',{name:'Enable on this browser',exact:true}).click({timeout:20000});
 await page.getByRole('status').waitFor({timeout:40000});
 const status=await page.getByRole('status').innerText();
 console.log('Subscription result:',status);
 if(!status.includes('Enabled for this browser')) throw new Error('Push subscription could not be created');
 const stored=await admin.from('push_subscriptions').select('id').eq('user_id',id);
 if(stored.error || stored.data.length!==1) throw new Error('Push subscription missing from database');
 console.log('PASS: browser push subscription persisted.');
 await page.getByRole('button',{name:'Send test notification',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('Test accepted'),{},{timeout:25000});
 console.log('PASS: real push service accepted test.');
 await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.ready;return (await r.getNotifications()).some(n=>n.title.includes('Paris Pulse'));},{},{timeout:40000});
 console.log('PASS: notification observed in service worker.');
 await page.getByRole('button',{name:'Disable on this browser',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('Notifications disabled'),{},{timeout:20000});
 const remaining=await admin.from('push_subscriptions').select('id').eq('user_id',id);
 if(remaining.error || remaining.data.length) throw new Error('Disable did not remove subscription');
 console.log('PASS: disable removes database subscription.');
} catch(error) {console.error('Verification blocked:',error.message);process.exitCode=1;}
finally {
 await browser?.close();
 await rm(profile,{recursive:true,force:true});
 if(id){const result=await admin.auth.admin.deleteUser(id);if(result.error) throw new Error('QA cleanup failed: '+result.error.message);console.log('Temporary QA account removed.');}
}
