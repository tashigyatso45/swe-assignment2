import { useState } from "react";
import Signup from "./components/Signup";
import Login from "./components/Login";
import "./App.css";
import CreateProject from "./components/createProject";
import ProjectList from "./components/ProjectList";
import ManageMembers from "./components/ManageMembers";
function App() {
    // Which form is showing: "signup" or "login"
    const [activeForm, setActiveForm] = useState("signup");
    // Goes up by 1 after each new project so ProjectList re-fetches
    const [projectsVersion, setProjectsVersion] = useState(0);

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
                <button
                    type="button"
                    className={activeForm === "projects" ? "tab active" : "tab"}
                    onClick={() => setActiveForm("projects")}
                    >
                Projects
                </button>
                <button
                    type="button"
                    className={activeForm === "members" ? "tab active" : "tab"}
                    onClick={() => setActiveForm("members")}
                    >
                    Members
                </button>
            </div>

            {activeForm === "signup" && <Signup />}
            {activeForm === "login" && <Login />}
            {activeForm === "projects" && (
                <>
                    <CreateProject
                    onProjectCreated={() => setProjectsVersion((version) => version + 1)}
                    />
                    <ProjectList refreshKey={projectsVersion} />
                </>
            
            )}
            {activeForm === "members" && <ManageMembers />}
        </div>
    );
}

export default App;