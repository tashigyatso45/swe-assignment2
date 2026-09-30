import { useState } from "react";

const LOGIN_URL = "http://localhost:9000/login";

function Login() {
    // One state value per form field
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    // Feedback shown to the user after submitting
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault(); // Stop the page from reloading

        try {
            const response = await fetch(LOGIN_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            setMessage(data.message);
            setIsSuccess(response.ok);
        } catch (error) {
            // fetch throws when the server can't be reached
            setMessage("Could not connect to the server");
            setIsSuccess(false);
        }
    }

    return (
        <form className="form" onSubmit={handleSubmit}>
            <h2>Log In</h2>

            <label>
                Username
                <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                />
            </label>

            <label>
                Password
                <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                />
            </label>

            <button type="submit">Log In</button>

            {message && (
                <p className={isSuccess ? "message success" : "message error"}>
                    {message}
                </p>
            )}
        </form>
    );
}

export default Login;