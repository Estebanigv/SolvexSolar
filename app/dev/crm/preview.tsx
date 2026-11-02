'use client';
import {useState} from 'react';
import QuoteApp from '../../quote-app';
import {createPreviewSource} from './source';

export default function Preview({initialPanel='crm'}:{initialPanel?:'quote'|'crm'}){
 const [source]=useState(createPreviewSource);
 return <QuoteApp initialPanel={initialPanel} previewSource={source}/>;
}
