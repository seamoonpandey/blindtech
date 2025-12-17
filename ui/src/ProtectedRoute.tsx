import { useAuth } from './AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const { token } = useAuth();
  
  // If we have a token but no user yet (loading), we might want to show a spinner
  // For simplicity, if no token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If we have a token but user is null, it might be fetching. 
  // Ideally AuthContext handles "loading" state.
  // For now, we render Outlet, and individual pages can handle null user redirect if needed,
  // or we can wait here.
  
  return <Outlet />;
}
