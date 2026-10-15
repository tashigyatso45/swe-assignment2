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

app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
});

// Returns true if any value is missing or only spaces
function hasEmptyField(...fieldValues) {
    return fieldValues.some((fieldValue) => !fieldValue || !fieldValue.trim());
}
// turns a string id into an ObjectID, or returns null if not vallid
function toObjectID(id){
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
    const leadId = toObjectID(project_lead_id)
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