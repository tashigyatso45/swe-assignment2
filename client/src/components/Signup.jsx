import { useState } from "react";

const SIGNUP_URL = "http://localhost:9000/signup";

function Signup() {
    // One state value per form field
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    // Feedback shown to the user after submitting
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault(); // Stop the page from reloading

        try {
            const response = await fetch(SIGNUP_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Property names match what the backend expects
                body: JSON.stringify({
                    f_name: firstName,
                    l_name: lastName,
                    username: username,
                    password: password
                })
            });

            const data = await response.json();
            setMessage(data.message);
            setIsSuccess(response.ok);

            // Clear the form after a successful signup
            if (response.ok) {
                setFirstName("");
                setLastName("");
                setUsername("");
                setPassword("");
            }
        } catch (error) {
            // fetch throws when the server can't be reached
            setMessage("Could not connect to the server");
            setIsSuccess(false);
        }
    }

    return (
        <form className="form" onSubmit={handleSubmit}>
            <h2>Sign Up</h2>

            <label>
                First Name
                <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                />
            </label>

            <label>
                Last Name
                <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                />
            </label>

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

            <button type="submit">Sign Up</button>

            {message && (
                <p className={isSuccess ? "message success" : "message error"}>
                    {message}
                </p>
            )}
        </form>
    );
}

export default Signup;