const express = require('express');
const { PrismaClient } = require('@prisma/client');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

app.use(express.json());

const main= async ()=>{
    const tasks= await prisma.task.findMany()
}

let res=main().then(()=>{console.log("connect");
}).catch((e)=>{console.log("failed",e);
})

console.log(res);

// Test route
app.get('/', (req, res) => {
  res.send('Task Manager API is running!');
});

// Create a task
app.post('/tasks', async (req, res) => {
  const { title, description, status } = req.body;
  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'pending',
      },
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'taskCreated', task }));
      }
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Error creating task' });
  }
});

// Get all tasks
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tasks' });
  }
});

// Get a single task by ID
app.get('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(id) },
    });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching task' });
  }
});

// Update a task
app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;
  try {
    const task = await prisma.task.update({
      where: { id: parseInt(id) },
      data: { title, description, status },
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'taskUpdated', task }));
      }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Error updating task' });
  }
});

// Delete a task
app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.task.delete({
      where: { id: parseInt(id) },
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'taskDeleted', id: parseInt(id) }));
      }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error deleting task' });
  }
});


// Start the server
const server= app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


//server when it is being implemented on the web
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  ws.on('message', (message) => {
    console.log(`Received from client: ${message}`);
    // Echo the message back to the client that sent it
    ws.send(JSON.stringify({ type: 'serverResponse', message: `Echo: ${message}` }));
    // Optionally broadcast to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client !== ws) {
        client.send(JSON.stringify({ type: 'broadcast', message: `User said: ${message}` }));
      }
    });
  });
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});


// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});