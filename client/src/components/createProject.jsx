import { useEffect, useState } from "react";
import { createProject, formatUser, getUsers } from "../projectHelper";

const STATUS_OPTIONS = ["Planning", "Active", "Completed"];

// Form for creating a project. Calls onProjectCreated so the list can refresh.
function CreateProject({ onProjectCreated }) {
    // One state value per form field
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("Planning");
    const [projectLeadId, setProjectLeadId] = useState("");

    // Registered users for the Project Lead dropdown
    const [users, setUsers] = useState([]);

    // Feedback shown after submitting
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    // Load the registered users once when the form appears
    useEffect(() => {
        getUsers().then((result) => {
            if (result.isSuccess) {
                setUsers(result.data.users);
            } else {
                setMessage(result.message);
                setIsSuccess(false);
            }
        });
    }, []);

    async function handleSubmit(event) {
        event.preventDefault(); // Stop the page from reloading

        const result = await createProject({
            name,
            description,
            status,
            project_lead_id: projectLeadId
        });

        setMessage(result.message);
        setIsSuccess(result.isSuccess);

        if (result.isSuccess) {
            setName("");
            setDescription("");
            setStatus("Planning");
            setProjectLeadId("");
            onProjectCreated(); // tell App a project was added
        }
    }

    return (
        <form className="form" onSubmit={handleSubmit}>
            <h2>Create Project</h2>

            <label>
                Name
                <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                />
            </label>

            <label>
                Description
                <textarea
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                />
            </label>

            <label>
                Status
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                    {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </label>

            <label>
                Project Lead
                <select
                    value={projectLeadId}
                    onChange={(event) => setProjectLeadId(event.target.value)}
                >
                    <option value="">-- Select a user --</option>
                    {users.map((user) => (
                        <option key={user._id} value={user._id}>
                            {formatUser(user)}
                        </option>
                    ))}
                </select>
            </label>

            <button type="submit">Create Project</button>

            {message && (
                <p className={isSuccess ? "message success" : "message error"}>
                    {message}
                </p>
            )}
        </form>
    );
}

export default CreateProject;