import {notFound} from 'next/navigation';
import SketchLab from './sketch-lab';
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <SketchLab/>}
