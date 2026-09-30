require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
const client = new MongoClient(process.env.MONGO_URI);

// The collection that stores user documents
const users = client.db("pa2").collection("users");

app.use(express.json()); // Read JSON sent from React
app.use(cors()); // Allow requests from the React app on port 5173

app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
});

// Returns true if any value is missing or only spaces
function hasEmptyField(...fieldValues) {
    return fieldValues.some((fieldValue) => !fieldValue || !fieldValue.trim());
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

async function connectDatabase() {
    try {
        await client.connect();
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