import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoodleApiError } from '../lib/moodle';
import { useAuthStore } from '../store/auth';

export function useAuthErrorRedirect(error: unknown) {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    if (error instanceof MoodleApiError && error.errorcode === 'invalidtoken') {
      logout();
      navigate('/login', { replace: true });
    }
  }, [error, logout, navigate]);
}
