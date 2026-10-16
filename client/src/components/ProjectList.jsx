import { useEffect, useState } from "react";
import { formatUser, getProjects } from "../projectHelper";

// Shows every project in MongoDB. refreshKey changes whenever a project is created.
function ProjectList({ refreshKey }) {
    const [projects, setProjects] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        getProjects().then((result) => {
            if (result.isSuccess) {
                setProjects(result.data.projects);
                setErrorMessage("");
            } else {
                setErrorMessage(result.message);
            }
        });
    }, [refreshKey]);

    return (
        <section className="section">
            <h2>Projects</h2>

            {errorMessage && <p className="message error">{errorMessage}</p>}

            {!errorMessage && projects.length === 0 && (
                <p className="empty">No projects yet. Create one above.</p>
            )}

            <ul className="project-list">
                {projects.map((project) => (
                    <li key={project._id} className="project-card">
                        <div className="project-header">
                            <strong>{project.name}</strong>
                            <span className="status">{project.status}</span>
                        </div>
                        <p>{project.description}</p>
                        <p className="lead">Project Lead: {formatUser(project.lead)}</p>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default ProjectList;