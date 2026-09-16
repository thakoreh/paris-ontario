import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/server',()=>({serverClient:async()=>({auth:{exchangeCodeForSession:async()=>({error:null})}})}));
import { NextRequest } from 'next/server';
import { GET } from '@/app/auth/callback/route';
afterEach(()=>vi.unstubAllEnvs());
it('uses public origin rather than internal container hostname for failed callback',async()=>{
 vi.stubEnv('NEXT_PUBLIC_APP_URL','https://parispulse.ca');
 const response=await GET(new NextRequest('http://0.0.0.0:3000/auth/callback?error=access_denied'));
 expect(response.headers.get('location')).toBe('https://parispulse.ca/login?error=confirmation');
});
it('keeps successful callbacks on the public origin including malformed next paths',async()=>{
 vi.stubEnv('NEXT_PUBLIC_APP_URL','https://parispulse.ca');
 for(const next of ['/reset-password','//evil.example','/\\evil.example','https://evil.example']){
  const response=await GET(new NextRequest('http://0.0.0.0:3000/auth/callback?code=test&next='+encodeURIComponent(next)));
  const url=new URL(response.headers.get('location')!);
  expect(url.origin).toBe('https://parispulse.ca');
  expect(url.pathname).toBe(next==='/reset-password'?'/reset-password':'/onboarding');
 }
});
