import { useState } from "react";
import { createStory, formatUser, updateStory } from "../projectHelper";

const PRIORITY_OPTIONS = ["High", "Medium", "Low"];
const STATUS_OPTIONS = ["To Do", "In Progress", "Done"];

// Form for creating a story, or editing one when a `story` is passed in.
// `members` is the selected project's member list: the only people who can be assigned.
// Calls onSaved(message) after a successful save so the backlog can refresh.
function StoryForm({ projectId, members, story, onSaved, onCancel }) {
    const isEditing = Boolean(story);

    // One state value per form field. When editing, start from the story's saved values.
    // This is a separate copy, so typing doesn't change the saved story until Save is clicked.
    const [title, setTitle] = useState(isEditing ? story.title : "");
    const [description, setDescription] = useState(isEditing ? story.description : "");
    const [priority, setPriority] = useState(isEditing ? story.priority : "");
    const [status, setStatus] = useState(isEditing ? story.status : "To Do");
    const [assignedUserId, setAssignedUserId] = useState(
        isEditing && story.assigned_user_id ? story.assigned_user_id : ""
    );

    // Error shown if the server rejects the save
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event) {
        event.preventDefault(); // Stop the page from reloading

        // Property names match what the backend expects.
        // "" in the dropdown means Unassigned, which is sent (and stored) as null.
        const storyValues = {
            title,
            description,
            priority,
            assigned_user_id: assignedUserId === "" ? null : assignedUserId
        };

        // Editing also sends the status; new stories always start as "To Do" on the server
        const result = isEditing
            ? await updateStory(projectId, story._id, { ...storyValues, status })
            : await createStory(projectId, storyValues);

        if (!result.isSuccess) {
            setErrorMessage(result.message);
            return;
        }

        setErrorMessage("");

        // Clear the create form so the next story starts blank
        if (!isEditing) {
            setTitle("");
            setDescription("");
            setPriority("");
            setAssignedUserId("");
        }

        onSaved(result.message);
    }

    return (
        <form className="form" onSubmit={handleSubmit}>
            <h3>{isEditing ? "Edit Story" : "Add a Story"}</h3>

            <label>
                Title
                <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                />
            </label>

            <label>
                Description
                <textarea
                    rows={3}
                    placeholder="As a [type of user], I want [goal], so that [benefit]."
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                />
            </label>

            <label>
                Priority
                <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                    <option value="">-- Select a priority --</option>
                    {PRIORITY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </label>

            {/* Status can only be changed when editing */}
            {isEditing && (
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
            )}

            <label>
                Assigned Member
                <select
                    value={assignedUserId}
                    onChange={(event) => setAssignedUserId(event.target.value)}
                >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                        <option key={member._id} value={member._id}>
                            {formatUser(member)}
                        </option>
                    ))}
                </select>
            </label>

            <button type="submit">{isEditing ? "Save Changes" : "Add Story"}</button>

            {/* Cancel just closes the form; nothing is sent to the server */}
            {isEditing && (
                <button type="button" className="cancel-button" onClick={onCancel}>
                    Cancel
                </button>
            )}

            {errorMessage && <p className="message error">{errorMessage}</p>}
        </form>
    );
}

export default StoryForm;
