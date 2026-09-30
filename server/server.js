require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
const client = new MongoClient(process.env.MONGO_URI);

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
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