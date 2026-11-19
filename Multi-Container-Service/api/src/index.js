
const express = require("express");
const mongoose = require("mongoose");
const Todo = require("./todo");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/todos";

app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "todo-api"
    });
});

// CREATE Todo
app.post("/todos", async (req, res) => {
    try {
        const todo = await Todo.create({
            title: req.body.title
        });

        res.status(201).json(todo);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

// READ Todos
app.get("/todos", async (req, res) => {
    try {
        const todos = await Todo.find();

        res.json(todos);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// UPDATE Todo
app.patch("/todos/:id", async (req, res) => {
    try {
        const todo = await Todo.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!todo) {
            return res.status(404).json({
                error: "Todo not found"
            });
        }

        res.json(todo);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

// Connect MongoDB
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("Connected to MongoDB");

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Todo API running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    });

// DELETE Todo
app.delete("/todos/:id", async (req, res) => {
    try {
        const todo = await Todo.findByIdAndDelete(req.params.id);

        if (!todo) {
            return res.status(404).json({
                error: "Todo not found"
            });
        }

        res.json({
            message: "Todo deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});
