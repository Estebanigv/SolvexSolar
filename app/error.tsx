'use client';
import {WorkspaceStatus} from './workspace-status';
export default function ErrorPage({retry}:{retry:()=>void}){
 return <WorkspaceStatus error="No pudimos abrir esta pantalla. Vuelve a intentarlo. Si ocurre en Safari, comprueba que el sistema esté actualizado. No borres los datos del navegador si tienes una cotización pendiente." onRetry={retry}/>;
}
