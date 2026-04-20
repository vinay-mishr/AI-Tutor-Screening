const API_BASE = process.env.REACT_APP_API_URL || '';

export async function sendMessage(messages) {
  const res = await fetch(`${API_BASE}/api/interview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const data = await res.json();
  return data.text;
}