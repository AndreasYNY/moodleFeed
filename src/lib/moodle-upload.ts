import { moodleRequestUrl, withQuery } from './utils';

export async function uploadMoodleFile(baseUrl: string, token: string, file: File, itemId = 0) {
  const form = new FormData();
  form.append('filearea', 'draft');
  form.append('component', 'user');
  form.append('filepath', '/');
  form.append('itemid', String(itemId));
  form.append('file', file);

  const response = await fetch(
    withQuery(moodleRequestUrl(baseUrl, '/webservice/upload.php'), new URLSearchParams({ token })),
    {
    method: 'POST',
    body: form,
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.exception) throw new Error(data?.message || 'Upload failed');
  return data as Array<{ itemid: number; filename: string; filepath: string }>;
}
