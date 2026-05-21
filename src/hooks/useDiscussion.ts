import { useQuery } from '@tanstack/react-query';
import { Moodle } from '../lib/moodle';
import { useAuthStore } from '../store/auth';

export function useDiscussion(discussionId: number | null) {
  const { baseUrl, token } = useAuthStore();

  return useQuery({
    queryKey: ['posts', discussionId],
    queryFn: () => Moodle.posts(baseUrl!, token!, discussionId!),
    enabled: Boolean(baseUrl && token && discussionId),
  });
}
