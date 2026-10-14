'use client';
import {useEffect,useState} from 'react';
import {checkPasskeySupport,type PasskeySupport} from '@/lib/passkeys';

export function usePasskeySupport(){
  const [support,setSupport]=useState<PasskeySupport>('checking');
  useEffect(()=>{
    let active=true;
    void checkPasskeySupport({secure:window.isSecureContext,origin:window.location.origin,
      available:typeof PublicKeyCredential!=='undefined'&&typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable==='function'
        ?()=>PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable():undefined,
    }).then(value=>{if(active)setSupport(value)});
    return()=>{active=false};
  },[]);
  return support;
}
