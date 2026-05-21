import { useQuery } from '@tanstack/react-query';
import { Moodle } from '../lib/moodle';
import { useAuthStore } from '../store/auth';

export function useCourses() {
  const { baseUrl, token, userId } = useAuthStore();

  return useQuery({
    queryKey: ['courses', userId],
    queryFn: () => Moodle.courses(baseUrl!, token!, userId!),
    enabled: Boolean(baseUrl && token && userId),
  });
}
