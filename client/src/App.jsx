import { useState } from "react";
import Signup from "./components/Signup";
import Login from "./components/Login";
import "./App.css";

function App() {
    // Which form is showing: "signup" or "login"
    const [activeForm, setActiveForm] = useState("signup");

    return (
        <div className="app">
            <div className="tabs">
                <button
                    type="button"
                    className={activeForm === "signup" ? "tab active" : "tab"}
                    onClick={() => setActiveForm("signup")}
                >
                    Sign Up
                </button>
                <button
                    type="button"
                    className={activeForm === "login" ? "tab active" : "tab"}
                    onClick={() => setActiveForm("login")}
                >
                    Log In
                </button>
            </div>

            {activeForm === "signup" ? <Signup /> : <Login />}
        </div>
    );
}

export default App;