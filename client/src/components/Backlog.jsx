import { useEffect, useState } from "react";
import { deleteStory, getProjectMembers, getProjectStories, getProjects } from "../projectHelper";
import StoryForm from "./StoryForm";
import StoryList from "./StoryList";

// Pick a project, see its backlog, and create, edit, or delete its user stories
function Backlog() {
    // Data for the project dropdown
    const [projects, setProjects] = useState([]);

    // The currently selected project, its stories, and its members (for the assign dropdown)
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [selectedProject, setSelectedProject] = useState(null);
    const [stories, setStories] = useState([]);
    const [members, setMembers] = useState([]);

    // Which story has its details open, and which story is being edited (null = none)
    const [openStoryId, setOpenStoryId] = useState(null);
    const [editingStoryId, setEditingStoryId] = useState(null);

    // Goes up by 1 after each create, edit, or delete so the backlog re-fetches
    const [storiesVersion, setStoriesVersion] = useState(0);

    // Feedback shown after each action
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    function showFeedback(result) {
        setMessage(result.message);
        setIsSuccess(result.isSuccess);
    }

    // Load the projects once for the dropdown
    useEffect(() => {
        getProjects().then((result) => {
            if (result.isSuccess) setProjects(result.data.projects);
            else showFeedback(result);
        });
    }, []);

    // Load the selected project's stories and members.
    // Runs again when the project changes or after a story is saved or deleted.
    useEffect(() => {
        if (!selectedProjectId) return;

        // If the user switches projects before these requests finish, isCurrent becomes false,
        // so the old project's results are ignored instead of replacing the new project's
        let isCurrent = true;

        Promise.all([
            getProjectStories(selectedProjectId),
            getProjectMembers(selectedProjectId)
        ]).then(([storiesResult, membersResult]) => {
            if (!isCurrent) return;

            if (storiesResult.isSuccess && membersResult.isSuccess) {
                setSelectedProject(storiesResult.data.project);
                setStories(storiesResult.data.stories);
                setMembers(membersResult.data.members);
            } else {
                setSelectedProject(null);
                setStories([]);
                setMembers([]);
                showFeedback(storiesResult.isSuccess ? membersResult : storiesResult);
            }
        });

        // Cleanup: runs when the project changes, before the next load starts
        return () => {
            isCurrent = false;
        };
    }, [selectedProjectId, storiesVersion]);

    function handleProjectChange(event) {
        // Switching projects clears anything that belonged to the old project
        setSelectedProjectId(event.target.value);
        setSelectedProject(null);
        setStories([]);
        setMembers([]);
        setOpenStoryId(null);
        setEditingStoryId(null);
        setMessage("");
    }

    // Called by StoryForm after a successful create or edit
    function handleStorySaved(successMessage) {
        setEditingStoryId(null);
        showFeedback({ isSuccess: true, message: successMessage });
        setStoriesVersion((version) => version + 1);
    }

    function handleToggleDetails(storyId) {
        setOpenStoryId(openStoryId === storyId ? null : storyId);
    }

    function handleEditStory(storyId) {
        setEditingStoryId(storyId);
        setMessage("");
    }

    async function handleDeleteStory(story) {
        // Ask first. Clicking Cancel leaves the story untouched.
        if (!window.confirm(`Delete the story "${story.title}"? This can't be undone.`)) {
            return;
        }

        const result = await deleteStory(selectedProjectId, story._id);
        showFeedback(result);

        if (result.isSuccess) {
            // Close the details or edit form if they were showing the deleted story
            if (openStoryId === story._id) setOpenStoryId(null);
            if (editingStoryId === story._id) setEditingStoryId(null);
            setStoriesVersion((version) => version + 1);
        }
    }

    const editingStory = stories.find((story) => story._id === editingStoryId);

    return (
        <section className="form">
            <h2>Project Backlog</h2>

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

            {!selectedProjectId && <p className="empty">Select a project to see its backlog.</p>}

            {selectedProject && (
                <>
                    {/* Show the edit form while editing, otherwise the create form.
                        `key` gives each form fresh state when the story or project changes. */}
                    {editingStory ? (
                        <StoryForm
                            key={editingStory._id}
                            projectId={selectedProjectId}
                            members={members}
                            story={editingStory}
                            onSaved={handleStorySaved}
                            onCancel={() => setEditingStoryId(null)}
                        />
                    ) : (
                        <StoryForm
                            key={selectedProjectId}
                            projectId={selectedProjectId}
                            members={members}
                            onSaved={handleStorySaved}
                        />
                    )}

                    {message && (
                        <p className={isSuccess ? "message success" : "message error"}>
                            {message}
                        </p>
                    )}

                    <h3>Backlog for {selectedProject.name}</h3>

                    <StoryList
                        stories={stories}
                        openStoryId={openStoryId}
                        onToggleDetails={handleToggleDetails}
                        onEdit={handleEditStory}
                        onDelete={handleDeleteStory}
                    />
                </>
            )}

            {/* Errors that happen before a project's backlog is shown */}
            {!selectedProject && message && (
                <p className={isSuccess ? "message success" : "message error"}>
                    {message}
                </p>
            )}
        </section>
    );
}

export default Backlog;
