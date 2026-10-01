import {notFound} from 'next/navigation';
import RecoveryTest from './test';
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <RecoveryTest/>}
