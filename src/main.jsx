import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // <--- เพิ่มตรงนี้
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* ครอบ App ด้วย BrowserRouter ที่นี่เพื่อให้ Router ทำงานคลุมทั้งแอพ */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)