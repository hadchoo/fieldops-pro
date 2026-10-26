
import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState('Connecting...')

  useEffect(() => {
    fetch('http://127.0.0.1:8000/health')
      .then(response => {
        if (!response.ok) {
          throw new Error('Backend unavailable')
        }
        return response.json()
      })
      .then(data => setStatus(data.status))
      .catch(() => setStatus('Connection failed'))
  }, [])

  return (
    <div>
      <h1>FieldOps Pro</h1>
      <h2>Smart Operations Management Platform</h2>

      <p>
        Manage events, equipment, budgets, tasks,
        and participants in one place.
      </p>

      <p>
        Backend Status: <strong>{status}</strong>
      </p>

      <button>Get Started</button>
    </div>
  )
}

export default App
