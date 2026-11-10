require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");// The only allowed values for a project's status
const PROJECT_STATUSES = ["Planning", "Active", "Completed"];
// The only allowed values for a user story (separate from project statuses)
const STORY_PRIORITIES = ["High", "Medium", "Low"];
const STORY_STATUSES = ["To Do", "In Progress", "Done"];
const app = express();
const client = new MongoClient(process.env.MONGO_URI);
// Fields of a user that are safe to send to the frontend (never the password)
const PUBLIC_USER_FIELDS = { f_name: 1, l_name: 1, username: 1 };

// The collection that stores user documents
const db = client.db("pa2");
//collections 
const users = db.collection("users");
const projects = db.collection("projects");
const projectMemberships = db.collection("projectMemberships");
const userStories = db.collection("userStories");


app.use(express.json()); // Read JSON sent from React
app.use(cors()); // Allow requests from the React app 


// Look up several users at once 
async function findUsersById(userIds) { 
    const matchingUsers = await users
        .find({ _id: { $in: userIds } }, { projection: PUBLIC_USER_FIELDS })
        .toArray();

    return new Map(matchingUsers.map((user) => [user._id.toString(), user]));
}

// Finds a project by its id string, or returns null if it doesn't exist
async function findProject(projectIdString) {
    const projectId = toObjectId(projectIdString);
    return projectId ? projects.findOne({ _id: projectId }) : null;
}

// Finds a user by its id string, or returns null if it doesn't exist
async function findUser(userIdString) {
    const userId = toObjectId(userIdString);
    return userId ? users.findOne({ _id: userId }, { projection: PUBLIC_USER_FIELDS }) : null;
}

app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
});

// Returns true if any value is missing, not text, or only spaces
function hasEmptyField(...fieldValues) {
    return fieldValues.some(
        (fieldValue) => typeof fieldValue !== "string" || !fieldValue.trim()
    );
}
// turns a string id into an ObjectID, or returns null if not vallid
function toObjectId(id){
    return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

// Create a new user if the username isn't taken
app.post("/signup", async (req, res) => {
    const { f_name, l_name, username, password } = req.body;

    if (hasEmptyField(f_name, l_name, username, password)) {
        return res.status(400).json({ message: "Please fill in all fields" });
    }

    try {
        const existingUser = await users.findOne({ username: username });

        if (existingUser) {
            return res.status(409).json({ message: "Username already exists" });
        }

        await users.insertOne({ f_name, l_name, username, password });

        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Check the username and password against the database
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (hasEmptyField(username, password)) {
        return res.status(400).json({ message: "Please enter your username and password" });
    }

    try {
        const matchingUser = await users.findOne({ username: username });

        if (!matchingUser) {
            return res.status(401).json({ message: "No account found with that username" });
        }

        if (matchingUser.password !== password) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        res.status(200).json({ message: `Login successful. Welcome, ${matchingUser.f_name}!` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
// List all registered users
app.get("/users", async (req, res) => {
    try {
        const allUsers = await users
        // only shows the list only these field, preventing security issues
            .find({}, { projection: { f_name: 1, l_name: 1, username: 1 } })
            .sort({ username: 1 })
            .toArray();

        res.status(200).json({ users: allUsers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
app.post("/projects", async (req, res) => {
    const {name, description, status, project_lead_id } = req.body;
    if (hasEmptyField(name, description, status, project_lead_id)){
        return res.status(400).json({message : "fill in all the project fields"})
    }
    // check whether the project has one of the three statuses. 
    if (!PROJECT_STATUSES.includes(status)){ 
        return res.status(400).json({message: "unknown status "})
    };
    const leadId = toObjectId(project_lead_id)
    if (!leadId) return res.status(404).json({message: "ID not found"})
    try {
        const lead = await users.findOne({ _id: leadId });
        if (!lead) return res.status(404).json({message: " provide correct id"});
        const results = await projects.insertOne({name: name, description : description, project_lead_id: leadId, status: status});
        await projectMemberships.insertOne({project_id: results.insertedId, user_id: leadId})
        return res.status(201).json({message: "Success"})
    }
    catch(error) {
        console.error(error);
        res.status(500).json({message: "server error"})
    }
    
});
// List all projects, attaching each Project Lead's name and username
app.get("/projects", async (req, res) => {
    try {
        const allProjects = await projects.find().sort({ name: 1 }).toArray();

        const leadsById = await findUsersById(
            allProjects.map((project) => project.project_lead_id)
        );

        const projectsWithLeads = allProjects.map((project) => ({
            ...project,
            lead: leadsById.get(project.project_lead_id.toString()) || null
        }));

        res.status(200).json({ projects: projectsWithLeads });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// List the members of one project
app.get("/projects/:projectId/members", async (req, res) => {
    try {
        const project = await findProject(req.params.projectId);

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // The membership documents only hold ids
        const memberships = await projectMemberships
            .find({ project_id: project._id })
            .toArray();

        // look up the matching users to get their names
        const usersById = await findUsersById(
            memberships.map((membership) => membership.user_id)
        );

        const members = memberships
            .map((membership) => usersById.get(membership.user_id.toString()))
            .filter(Boolean)
            .sort((a, b) => a.username.localeCompare(b.username));

        res.status(200).json({ project, members });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
// Add a registered user to a project
app.post("/projects/:projectId/members", async (req, res) => {
    const { user_id } = req.body;

    if (hasEmptyField(user_id)) {
        return res.status(400).json({ message: "Please select a user to add" });
    }

    try {
        const project = await findProject(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const user = await findUser(user_id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const existingMembership = await projectMemberships.findOne({
            project_id: project._id,
            user_id: user._id
        });

        if (existingMembership) {
            return res.status(409).json({
                message: `${user.username} is already a member of ${project.name}`
            });
        }

        await projectMemberships.insertOne({ project_id: project._id, user_id: user._id });

        res.status(201).json({ message: `${user.username} was added to ${project.name}` });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "That user is already a member of this project" });
        }
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
// Remove a non-lead member from a project
app.delete("/projects/:projectId/members/:userId", async (req, res) => {
    try {
        const project = await findProject(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const user = await findUser(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (project.project_lead_id.equals(user._id)) {
            return res.status(403).json({
                message: `${user.username} is the Project Lead and cannot be removed`
            });
        }

        // A member can't leave while they still have stories in THIS project (Done ones count too).
        // Stories in other projects don't matter here.
        const assignedStoryCount = await userStories.countDocuments({
            project_id: project._id,
            assigned_user_id: user._id
        });

        if (assignedStoryCount > 0) {
            return res.status(409).json({
                message: `${user.username} still has ${assignedStoryCount} assigned ${assignedStoryCount === 1 ? "story" : "stories"} in ${project.name}. Reassign, unassign, or delete them before removing this member.`
            });
        }

        const result = await projectMemberships.deleteOne({
            project_id: project._id,
            user_id: user._id
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: `${user.username} is not a member of ${project.name}`
            });
        }

        res.status(200).json({ message: `${user.username} was removed from ${project.name}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
// USER STORY. PA4

// Finds a story by its id string inside one project, or returns null.
// Searching by both ids means a story can only be reached through its own project.
async function findStory(project, storyIdString) {
    const storyId = toObjectId(storyIdString);
    return storyId ? userStories.findOne({ _id: storyId, project_id: project._id }) : null;
}

// Returns an error message if the story's text fields or priority are invalid, or null if they're fine
function getStoryFieldError(title, description, priority) {
    if (hasEmptyField(title, description, priority)) {
        return "Please fill in the title, description, and priority";
    }

    if (!STORY_PRIORITIES.includes(priority)) {
        return "Priority must be High, Medium, or Low";
    }

    return null;
}

// Checks the assigned member sent from React.
// null means Unassigned. Otherwise the user must exist AND be a member of this project.
// Returns { assignedUserId } when it's valid, or { status, message } when it isn't.
async function checkAssignedUser(project, assignedUserIdString) {
    if (assignedUserIdString === null || assignedUserIdString === undefined) {
        return { assignedUserId: null };
    }

    const assignedUserId = typeof assignedUserIdString === "string"
        ? toObjectId(assignedUserIdString)
        : null;

    if (!assignedUserId) {
        return { status: 400, message: "Invalid assigned member" };
    }

    const user = await users.findOne({ _id: assignedUserId });
    if (!user) {
        return { status: 404, message: "The assigned user does not exist" };
    }

    // Same membership lookup as adding a member in PA3
    const membership = await projectMemberships.findOne({
        project_id: project._id,
        user_id: assignedUserId
    });

    if (!membership) {
        return {
            status: 400,
            message: `${user.username} is not a member of ${project.name} and can't be assigned`
        };
    }

    return { assignedUserId };
}

// List every story in one project (all statuses), with the assigned member's name attached
app.get("/projects/:projectId/stories", async (req, res) => {
    try {
        const project = await findProject(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const projectStories = await userStories
            .find({ project_id: project._id })
            .toArray();

        // Look up the assigned users in one query (skip unassigned stories)
        const assignedUsersById = await findUsersById(
            projectStories
                .filter((story) => story.assigned_user_id)
                .map((story) => story.assigned_user_id)
        );

        const storiesWithMembers = projectStories.map((story) => ({
            ...story,
            assigned_user: story.assigned_user_id
                ? assignedUsersById.get(story.assigned_user_id.toString()) || null
                : null
        }));

        res.status(200).json({ project, stories: storiesWithMembers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Create a story in a project. New stories always start as "To Do".
app.post("/projects/:projectId/stories", async (req, res) => {
    const { title, description, priority, assigned_user_id } = req.body;

    try {
        const project = await findProject(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const fieldError = getStoryFieldError(title, description, priority);
        if (fieldError) {
            return res.status(400).json({ message: fieldError });
        }

        const assignment = await checkAssignedUser(project, assigned_user_id);
        if (assignment.message) {
            return res.status(assignment.status).json({ message: assignment.message });
        }

        // Build the document field by field (never insert req.body directly),
        // so a request can't choose its own status, _id, or project
        const newStory = {
            project_id: project._id,
            title: title.trim(),
            description: description.trim(),
            priority,
            status: "To Do",
            assigned_user_id: assignment.assignedUserId
        };

        const result = await userStories.insertOne(newStory);

        res.status(201).json({
            message: `Story "${newStory.title}" was added to ${project.name}`,
            story: { _id: result.insertedId, ...newStory }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Save an edited story. Title, description, priority, status, and assigned member can change;
// the story's project never does.
app.put("/projects/:projectId/stories/:storyId", async (req, res) => {
    const { title, description, priority, status, assigned_user_id } = req.body;

    try {
        const project = await findProject(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const story = await findStory(project, req.params.storyId);
        if (!story) {
            return res.status(404).json({ message: "Story not found in this project" });
        }

        const fieldError = getStoryFieldError(title, description, priority);
        if (fieldError) {
            return res.status(400).json({ message: fieldError });
        }

        if (!STORY_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Status must be To Do, In Progress, or Done" });
        }

        const assignment = await checkAssignedUser(project, assigned_user_id);
        if (assignment.message) {
            return res.status(assignment.status).json({ message: assignment.message });
        }

        // Only these fields are updated; _id and project_id stay the same
        const updates = {
            title: title.trim(),
            description: description.trim(),
            priority,
            status,
            assigned_user_id: assignment.assignedUserId
        };

        // Match on both ids so a story can only be edited through its own project
        const result = await userStories.updateOne(
            { _id: story._id, project_id: project._id },
            { $set: updates }
        );

        // matchedCount (not modifiedCount): saving unchanged values is still a success
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Story not found in this project" });
        }

        res.status(200).json({ message: `Story "${updates.title}" was updated` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete a story from a project
app.delete("/projects/:projectId/stories/:storyId", async (req, res) => {
    try {
        const project = await findProject(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const storyId = toObjectId(req.params.storyId);
        if (!storyId) {
            return res.status(404).json({ message: "Story not found in this project" });
        }

        // Both ids again: a story from another project can't be deleted through this URL
        const result = await userStories.deleteOne({ _id: storyId, project_id: project._id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Story not found in this project" });
        }

        res.status(200).json({ message: "Story deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

async function connectDatabase() {
    try {
        await client.connect();
        // creates a index to keep track of duplication
        await projectMemberships.createIndex (
            { project_id: 1, user_id:1},
            {unique: true}
        );
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Could not connect to MongoDB");
        console.error(error);
    }
}

connectDatabase();

app.listen(9000, () => {
    console.log("Server running on port 9000");
});