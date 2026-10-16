A full-stack React + Express + MongoDB app that builds on PA2 (Sign Up / Log In) and adds
projects and a many-to-many relationship between users and projects.

## Features
- **Sign Up / Log In** (from PA2)
- **Projects tab:** create a project (name, description, status, Project Lead chosen from
  registered users) and view all projects with each lead's name
- **Members tab:** select a project, view its members, add a user, remove non-lead members

## Running the app

Requires Node.js and a MongoDB connection string (Atlas or local).

### Backend
```bash
cd server
npm install
node server.js
```
Create `server/.env` containing:
```
MONGO_URI=<your MongoDB connection string>
```
The server runs on http://localhost:9000.

### Frontend (in a second terminal)
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173.

## Data model

| Collection | Fields |
|---|---|
| `users` | `_id`, `f_name`, `l_name`, `username`, `password` |
| `projects` | `_id`, `name`, `description`, `status`, `project_lead_id` (ObjectId → users) |
| `projectMemberships` | `_id`, `project_id` (ObjectId → projects), `user_id` (ObjectId → users) |

- `projectMemberships` is the join collection for the many-to-many relationship. It stores
  only ObjectId references, never copied names.
- A unique index on `{ project_id, user_id }` prevents duplicate memberships.
- When a project is created, its Project Lead is automatically added as a member.

## API routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/signup` | Create a user |
| POST | `/login` | Log in |
| GET | `/users` | List users (no passwords) |
| POST | `/projects` | Create a project + add lead as member |
| GET | `/projects` | List projects with lead info |
| GET | `/projects/:projectId/members` | List a project's members |
| POST | `/projects/:projectId/members` | Add a member |
| DELETE | `/projects/:projectId/members/:userId` | Remove a non-lead member |

## Error handling
- 400: empty fields or invalid status
- 404: project, user, or Project Lead not found
- 409: user is already a member
- 403: attempt to remove the Project Lead
- 500: database or server error

The frontend shows each result in a green (success) or red (error) message.

## Project structure
```
server/server.js                  Express routes + MongoDB
client/src/projectHelper.js       fetch helpers for all project/membership requests
client/src/components/
  Signup.jsx, Login.jsx           PA2
  CreateProject.jsx               Create Project form
  ProjectList.jsx                 Project list
  ManageMembers.jsx               Membership management
```