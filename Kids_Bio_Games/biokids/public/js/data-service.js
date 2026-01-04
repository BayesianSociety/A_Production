const readJson = async (response) => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
  return response.json();
};

export const api = {
  async getQuestions({ topic, ageBand = '', limit = 20 }) {
    const search = new URLSearchParams({ topic: topic || '', ageBand, limit });
    const response = await fetch(`/api/questions?${search}`);
    return readJson(response);
  },
  async getBodyParts() {
    const response = await fetch('/api/bodyparts');
    return readJson(response);
  },
  async saveAttempt(attempt) {
    const response = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attempt),
    });
    return readJson(response);
  },
};
