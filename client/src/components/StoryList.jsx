import { formatUser } from "../projectHelper";

// Shows a project's stories. The parent (Backlog) decides which story's details are open
// and what happens when Edit or Delete is clicked.
function StoryList({ stories, openStoryId, onToggleDetails, onEdit, onDelete }) {
    if (stories.length === 0) {
        return <p className="empty">No stories in this project yet. Add one above.</p>;
    }

    return (
        <ul className="story-list">
            {stories.map((story) => {
                const isOpen = story._id === openStoryId;

                return (
                    <li key={story._id} className="story-card">
                        <strong>{story.title}</strong>
                        <p>
                            Priority: {story.priority} | Status: {story.status}
                        </p>
                        <p>
                            Assigned: {story.assigned_user_id ? formatUser(story.assigned_user) : "Unassigned"}
                        </p>

                        {/* The description is shown in the details view */}
                        {isOpen && <p className="story-description">{story.description}</p>}

                        <div className="story-actions">
                            <button type="button" onClick={() => onToggleDetails(story._id)}>
                                {isOpen ? "Hide Details" : "Details"}
                            </button>
                            <button type="button" onClick={() => onEdit(story._id)}>
                                Edit
                            </button>
                            <button type="button" className="remove-button" onClick={() => onDelete(story)}>
                                Delete
                            </button>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

export default StoryList;
