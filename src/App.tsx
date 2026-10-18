import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Permits from './pages/Permits'
import NetMetering from './pages/NetMetering'
import Documents from './pages/Documents'
import Tasks from './pages/Tasks'
import Contractors from './pages/Contractors'
import Payments from './pages/Payments'
import Reports from './pages/Reports'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import Forecast from './pages/Forecast'
import AfterInstall from './pages/AfterInstall'
import Equipment from './pages/Equipment'
import Rejections from './pages/Rejections'
import Weather from './pages/Weather'
import Subsidy from './pages/Subsidy'
import PublicStatus from './pages/PublicStatus'
import Login from './pages/Login'
import { Pending, ResetPassword } from './pages/AuthScreens'
import { useAuth } from './auth/AuthContext'
import { demoMode } from './lib/supabase'
export default function App() {
  return <Routes><Route path="/status/:token" element={<PublicStatus/>}/><Route path="*" element={<Gate/>}/></Routes>
}
function Gate() {
  const { ready, userId, approved, recovery } = useAuth()
  if (!ready) return <p className="p-6">Loading…</p>
  if (!demoMode && recovery) return <ResetPassword/>
  if (!demoMode && !userId) return <Login/>
  if (!demoMode && !approved) return <Pending/>
  return <Routes><Route element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="projects" element={<Projects/>}/><Route path="projects/:id" element={<ProjectDetail/>}/>
    <Route path="permits" element={<Permits/>}/><Route path="net-metering" element={<NetMetering/>}/><Route path="documents" element={<Documents/>}/><Route path="tasks" element={<Tasks/>}/>
    <Route path="contractors" element={<Contractors/>}/><Route path="payments" element={<Payments/>}/><Route path="equipment" element={<Equipment/>}/><Route path="rejections" element={<Rejections/>}/><Route path="weather" element={<Weather/>}/><Route path="subsidy" element={<Subsidy/>}/><Route path="forecast" element={<Forecast/>}/><Route path="after-install" element={<AfterInstall/>}/>
    <Route path="reports" element={<Reports/>}/><Route path="notifications" element={<Notifications/>}/><Route path="settings" element={<Settings/>}/>
    <Route path="*" element={<Navigate to="/"/>}/></Route></Routes>
}
