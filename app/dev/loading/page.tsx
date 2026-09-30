import {notFound} from 'next/navigation';
import {WorkspaceStatus} from '../../workspace-status';
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <WorkspaceStatus/>}
