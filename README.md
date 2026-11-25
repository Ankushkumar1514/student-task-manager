# Student Task Manager

A beginner-friendly full-stack web app for tracking academic assignments, deadlines, subjects, and priorities.

## Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript (`fetch` API)
- **Backend:** Node.js + Express (`express.Router()`, middleware, REST API)
- **Storage:** Local JSON file (`data/tasks.json`)

## Project Structure

```text
student-task-manager/
├── data/
│   └── tasks.json          # Saved tasks stored as JSON
├── public/
│   ├── index.html          # Page structure
│   ├── styles.css          # Layout and styling
│   └── app.js              # Browser logic and API calls
├── routes/
│   └── tasks.js            # Express REST endpoints for /api/tasks
├── server.js               # Main Express server setup
├── package.json            # Dependencies and scripts
└── README.md               # Project documentation
```

## How to Run Locally

1. Install dependencies (if not already installed):
   ```powershell
   npm.cmd install
   ```
   *(If PowerShell allows npm scripts on your system, `npm install` also works.)*
2. Start the server:
   ```powershell
   node server.js
   ```
   Or auto-restart on file edits during development:
   ```powershell
   node --watch server.js
   ```
3. Open your browser to:
   ```text
   http://localhost:3000
   ```

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Check if the server is running |
| `GET` | `/api/tasks` | Get all tasks (supports `?status=pending\|completed` and `?subject=...`) |
| `POST` | `/api/tasks` | Create a new task (`title`, `subject`, optional `dueDate`, `priority`) |
| `PATCH` | `/api/tasks/:id` | Update a task (such as toggling `completed`) |
| `DELETE` | `/api/tasks/:id` | Delete a task by ID |

## Next Steps for MERN Practice

1. **Add MongoDB (M in MERN):** Replace `readTasks()` and `writeTasks()` in `routes/tasks.js` with a Mongoose `Task` model—notice how the API URLs and `public/app.js` won't even need to change!
2. **Add React (R in MERN):** Rebuild the `public/` UI as React components that call the exact same `/api/tasks` endpoints.
