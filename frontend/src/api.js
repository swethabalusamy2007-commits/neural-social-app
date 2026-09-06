const API_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("neural_token");
  const headers = { ...(options.headers || {}) };

  if (options.body && typeof options.body !== "string") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  signup: (body) => request("/auth/signup", { method: "POST", body }),
  login: (body) => request("/api/auth/login", { method: "POST", body }),
  me: () => request("/auth/me"),
  posts: (page = 1, limit = 5) => request(`/posts?page=${page}&limit=${limit}`),
  createPost: (body) => request("/posts", { method: "POST", body }),
  deletePost: (id) => request(`/posts/${id}`, { method: "DELETE" }),
  toggleLike: (id) => request(`/posts/${id}/like`, { method: "POST" }),
  comment: (id, text) => request(`/posts/${id}/comments`, { method: "POST", body: { text } })
};
