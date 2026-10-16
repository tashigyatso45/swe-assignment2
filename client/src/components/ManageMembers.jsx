import { useEffect, useState } from "react";
import {
    addProjectMember,
    formatUser,
    getProjectMembers,
    getProjects,
    getUsers,
    removeProjectMember
} from "../projectHelper";

// Pick a project, see its members, add users, and remove non-lead members
function ManageMembers() {
    // Data for the two dropdowns
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);

    // The currently selected project and its members
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [selectedProject, setSelectedProject] = useState(null);
    const [members, setMembers] = useState([]);

    // Which user is picked in the "Add" dropdown
    const [userToAddId, setUserToAddId] = useState("");

    // Feedback shown after each action
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    function showFeedback(result) {
        setMessage(result.message);
        setIsSuccess(result.isSuccess);
    }

    // Load projects and users once for the dropdowns
    useEffect(() => {
        getProjects().then((result) => {
            if (result.isSuccess) setProjects(result.data.projects);
            else showFeedback(result);
        });
        getUsers().then((result) => {
            if (result.isSuccess) setUsers(result.data.users);
            else showFeedback(result);
        });
    }, []);

    // Fetch the current member list for a project from the server
    async function loadMembers(projectId) {
        if (!projectId) {
            setSelectedProject(null);
            setMembers([]);
            return;
        }

        const result = await getProjectMembers(projectId);

        if (result.isSuccess) {
            setSelectedProject(result.data.project);
            setMembers(result.data.members);
        } else {
            setSelectedProject(null);
            setMembers([]);
            showFeedback(result);
        }
    }

    function handleProjectChange(event) {
        const projectId = event.target.value;
        setSelectedProjectId(projectId);
        setUserToAddId("");
        setMessage("");
        loadMembers(projectId);
    }

    async function handleAddMember(event) {
        event.preventDefault();

        if (!userToAddId) {
            showFeedback({ isSuccess: false, message: "Please select a user to add" });
            return;
        }

        const result = await addProjectMember(selectedProjectId, userToAddId);
        showFeedback(result);

        if (result.isSuccess) {
            setUserToAddId("");
            loadMembers(selectedProjectId);
        }
    }

    async function handleRemoveMember(userId) {
        const result = await removeProjectMember(selectedProjectId, userId);
        showFeedback(result);

        if (result.isSuccess) {
            loadMembers(selectedProjectId);
        }
    }

    return (
        <section className="form">
            <h2>Manage Members</h2>

            <label>
                Project
                <select value={selectedProjectId} onChange={handleProjectChange}>
                    <option value="">-- Select a project --</option>
                    {projects.map((project) => (
                        <option key={project._id} value={project._id}>
                            {project.name}
                        </option>
                    ))}
                </select>
            </label>

            {selectedProject && (
                <>
                    <h3>Members of {selectedProject.name}</h3>

                    <ul className="member-list">
                        {members.map((member) => {
                            const isLead = member._id === selectedProject.project_lead_id;

                            return (
                                <li key={member._id} className="member-row">
                                    <span>
                                        {formatUser(member)}
                                        {isLead && <span className="lead-badge">Lead</span>}
                                    </span>
                                    {!isLead && (
                                        <button
                                            type="button"
                                            className="remove-button"
                                            onClick={() => handleRemoveMember(member._id)}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    <form className="add-member" onSubmit={handleAddMember}>
                        <select
                            value={userToAddId}
                            onChange={(event) => setUserToAddId(event.target.value)}
                        >
                            <option value="">-- Select a user --</option>
                            {users.map((user) => (
                                <option key={user._id} value={user._id}>
                                    {formatUser(user)}
                                </option>
                            ))}
                        </select>
                        <button type="submit">Add Member</button>
                    </form>
                </>
            )}

            {message && (
                <p className={isSuccess ? "message success" : "message error"}>
                    {message}
                </p>
            )}
        </section>
    );
}

export default ManageMembers;