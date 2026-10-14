"use client";
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {LockKeyhole,ArrowRight,LoaderCircle,Eye,EyeOff,Fingerprint} from 'lucide-react';
import {browserDatabase} from '@/lib/supabase/client';
import {usePasskeySupport} from '@/hooks/use-passkey-support';
import {passkeyError} from '@/lib/passkeys';
export default function Login({pending=false}:{pending?:boolean}){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const support=usePasskeySupport();
  const operation=useRef(false),controller=useRef<AbortController|null>(null);
  const [biometric,setBiometric]=useState(false);
  useEffect(()=>()=>controller.current?.abort(),[]);
  async function signInWithDevice(){
    if(operation.current||support!=='available')return;
    operation.current=true;setBusy(true);setBiometric(true);setError('');
    controller.current=new AbortController();
    try{
      const {data,error}=await browserDatabase().auth.signInWithPasskey({options:{signal:controller.current.signal}});
      if(error)throw error;
      if(!data?.session||!data.user)throw Error('Missing verified session');
      window.location.assign('/');
    }catch(e){setError(passkeyError(e))}
    finally{operation.current=false;setBusy(false);setBiometric(false);controller.current=null}
  }
  async function submit(e:FormEvent){e.preventDefault();if(operation.current)return;operation.current=true;setBusy(true);setError('');
    try{const {error}=await browserDatabase().auth.signInWithPassword({email:email.trim(),password});if(error){setError('No pudimos iniciar sesión. Revisa tu correo y contraseña, o consulta al administrador.');return}window.location.assign('/')}
    catch{setError('No hay conexión con el servicio de acceso. Inténtalo nuevamente.')}finally{operation.current=false;setBusy(false)}
  }
  return <main className="auth-shell"><section className="auth-intro"><div className="auth-intro-content"><div className="auth-logo"><img src="/logo.jpg" alt="Solvex Solar" width={1280} height={853}/></div><span className="auth-platform">PLATAFORMA COMERCIAL</span><h1>Tu equipo.<br/>Cada proyecto.<br/><em>Un mismo lugar.</em></h1><p>Clientes, equipos y propuestas solares en el espacio privado de Solvex Solar.</p><div className="auth-security"><LockKeyhole size={18}/> Acceso para usuarios autorizados</div></div><footer className="auth-credit" aria-label="Desarrollado por Fogeli"><span>Desarrollado por</span><img src="/fogeli-white.png" alt="Fogeli" width={1900} height={568}/></footer></section><section className="auth-card"><span className="auth-eyebrow">BIENVENIDO A SOLVEX SOLAR</span><h2>Ingresa a tu espacio</h2><p>Usa la cuenta que te asignó la empresa.</p>{pending&&<div className="auth-notice" role="status">Tu sesión es válida, pero falta autorizar tu acceso. Solicita la activación al administrador.</div>}{support==='available'&&<div className="auth-biometric"><button type="button" disabled={busy} onClick={()=>void signInWithDevice()}>{biometric?<LoaderCircle className="animate-spin" size={20}/>:<Fingerprint size={22}/>} {biometric?'Verifica en tu dispositivo…':'Ingresar con Face ID o huella'}</button><p>Actívalo primero en Mi cuenta → Face ID y claves de acceso. Tu dispositivo también puede solicitar su PIN.</p><span>O ingresa con tu contraseña</span></div>}<form onSubmit={submit}><label htmlFor="login-email">Correo electrónico</label><input id="login-email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor="login-password">Contraseña</label><div className="auth-password-field"><input id="login-password" type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button className="auth-password-toggle" type="button" aria-label={showPassword?'Ocultar contraseña':'Mostrar contraseña'} aria-controls="login-password" title={showPassword?'Ocultar contraseña':'Mostrar contraseña'} onClick={()=>setShowPassword(visible=>!visible)}>{showPassword?<EyeOff size={20} aria-hidden="true"/>:<Eye size={20} aria-hidden="true"/>}</button></div>{error&&<p className="field-error" role="alert">{error}</p>}<button disabled={busy} type="submit">{busy?<LoaderCircle className="animate-spin" size={18}/>:<ArrowRight size={18}/>} {busy&&!biometric?'Ingresando…':'Ingresar'}</button></form><p className="auth-help">¿Necesitas una cuenta o recuperar tu acceso? Contacta al administrador de Solvex Solar.</p></section></main>;
}
