import { moodleProxyHeaders, moodleRequestUrl, withQuery } from './utils';

export async function uploadMoodleFile(baseUrl: string, token: string, file: File, itemId = 0) {
  const form = new FormData();
  form.append('filearea', 'draft');
  form.append('component', 'user');
  form.append('filepath', '/');
  form.append('itemid', String(itemId));
  form.append('file', file);

  const url = moodleRequestUrl(baseUrl, '/webservice/upload.php');
  const isProxyUpload = url.startsWith('/api/moodle/');
  const response = await fetch(
    isProxyUpload ? url : withQuery(url, new URLSearchParams({ token })),
    {
      method: 'POST',
      headers: isProxyUpload ? { 'X-Moodle-Token': token, ...moodleProxyHeaders(baseUrl) } : undefined,
      body: form,
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.exception) throw new Error(data?.message || 'Upload failed');
  return data as Array<{ itemid: number; filename: string; filepath: string }>;
}
