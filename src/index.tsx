import React from 'react'
import ReactDOM from 'react-dom/client'
import IdProvider from './components/id-provider'
import CoreMetadataProvider from './components/core-metadata-provider'
import BlendProvider from './components/blend-provider'
import App from './components/app'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <IdProvider>
            <CoreMetadataProvider>
                <BlendProvider>
                    <App />
                </BlendProvider>
            </CoreMetadataProvider>
        </IdProvider>
    </React.StrictMode>
)
