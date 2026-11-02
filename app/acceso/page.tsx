import Login from './sign-in';
export default async function Access({searchParams}:{searchParams:Promise<{estado?:string;next?:string}>}){
 const params=await searchParams;
 return <Login pending={params.estado==='pendiente'} returnTo={params.next==='/crm'?'/crm':'/'}/>;
}
