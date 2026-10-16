require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");// The only allowed values for a project's status
const PROJECT_STATUSES = ["Planning", "Active", "Completed"];
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

// Returns true if any value is missing or only spaces
function hasEmptyField(...fieldValues) {
    return fieldValues.some((fieldValue) => !fieldValue || !fieldValue.trim());
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