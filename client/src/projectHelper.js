const SERVER_URL = "http://localhost:9000";

// Sends a request and always returns { isSuccess, message, data }
async function request(path, method = "GET", body) {
    try {
        const response = await fetch(`${SERVER_URL}${path}`, {
            method,
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await response.json();
        return { isSuccess: response.ok, message: data.message, data };
    } catch {
        // fetch throws when the server can't be reached
        return { isSuccess: false, message: "Could not connect to the server", data: null };
    }
}

export function getUsers() {
    return request("/users");
}

export function getProjects() {
    return request("/projects");
}

export function createProject(project) {
    return request("/projects", "POST", project);
}

export function getProjectMembers(projectId) {
    return request(`/projects/${projectId}/members`);
}

export function addProjectMember(projectId, userId) {
    return request(`/projects/${projectId}/members`, "POST", { user_id: userId });
}

export function removeProjectMember(projectId, userId) {
    return request(`/projects/${projectId}/members/${userId}`, "DELETE");
}

// "Jane Doe (jdoe)" — how a user is shown everywhere in the UI
export function formatUser(user) {
    return user ? `${user.f_name} ${user.l_name} (${user.username})` : "Unknown user";
}