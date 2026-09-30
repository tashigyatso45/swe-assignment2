const API_BASE_URL = "http://localhost:4000/api";

// Sends a JSON POST request and returns { isSuccess, message } for the UI
async function sendPostRequest(endpoint, requestBody) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();
    return { isSuccess: response.ok, message: responseData.message };
  } catch {
    // Network failure: server is down or unreachable
    return { isSuccess: false, message: "Could not reach the server. Make sure it is running." };
  }
}

export function signupUser(newUser) {
  return sendPostRequest("/signup", newUser);
}

export function loginUser(credentials) {
  return sendPostRequest("/login", credentials);
}