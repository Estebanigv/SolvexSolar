import Login from './sign-in';
export default async function Access({searchParams}:{searchParams:Promise<{estado?:string}>}){return <Login pending={(await searchParams).estado==='pendiente'}/>}
