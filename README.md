# ICSI 418Y – Programming Assignment 4: User Stories and Project Backlog

A full-stack React + Express + MongoDB app. It builds on PA2 (Sign Up / Log In) and PA3
(projects and project memberships) and adds user stories and a backlog for each project.

## Features
- **Sign Up / Log In** (PA2)
- **Projects tab:** create a project (name, description, status, Project Lead chosen from
  registered users) and view all projects with each lead's name (PA3)
- **Members tab:** select a project, view its members, add a user, remove non-lead members (PA3)
- **Backlog tab (PA4):**
  - select a project and view all of its stories (To Do, In Progress, and Done)
  - create a story with a title, description, priority, and an assigned member or Unassigned
  - open a story's details to read its description
  - edit a story's title, description, priority, status, and assigned member (Cancel discards changes)
  - delete a story after a confirmation prompt

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

## Preparing test data

With both servers running, use the app to create:

1. **Users (Sign Up tab):** at least three, e.g. `alice`, `bob`, `carol`.
2. **Projects (Projects tab):** two projects, e.g. **Apollo** (lead: alice) and **Zephyr** (lead: bob).
3. **Members (Members tab):** add **carol** to **Apollo only**, so she is a non-lead member of one
   project and not the other.
4. **Stories (Backlog tab):** at least five stories across both projects, for example:

| Project | Title | Priority | Assigned | Status (set by editing) |
|---|---|---|---|---|
| Apollo | View campus event details | High | carol | To Do |
| Apollo | Log in with campus email | Medium | alice | In Progress |
| Apollo | Search events by date | Low | Unassigned | Done |
| Zephyr | Receive push notifications | High | bob | In Progress |
| Zephyr | Save favorite events | Low | Unassigned | To Do |

New stories always start as **To Do**; use **Edit** to set the other statuses.

Things to verify:
- In Zephyr's backlog, carol does **not** appear in the Assigned Member dropdown.
- In the Members tab, removing carol from Apollo is rejected while she has stories there.
- Changes are still there after refreshing the page.

## Data model

| Collection | Fields |
|---|---|
| `users` | `_id`, `f_name`, `l_name`, `username`, `password` |
| `projects` | `_id`, `name`, `description`, `status`, `project_lead_id` (ObjectId → users) |
| `projectMemberships` | `_id`, `project_id` (ObjectId → projects), `user_id` (ObjectId → users) |
| `userStories` | `_id`, `project_id` (ObjectId → projects), `title`, `description`, `priority`, `status`, `assigned_user_id` (ObjectId → users, or `null` for Unassigned) |

- `projectMemberships` is the join collection for the many-to-many relationship. It stores
  only ObjectId references, never copied names.
- A unique index on `{ project_id, user_id }` prevents duplicate memberships.
- When a project is created, its Project Lead is automatically added as a member.
- Each story belongs to exactly one project. Its `project_id` never changes after creation.
- `priority` is High, Medium, or Low. `status` is To Do, In Progress, or Done (separate from
  project statuses). The server sets every new story's status to To Do.
- A story can only be assigned to a current member of its own project.

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
| DELETE | `/projects/:projectId/members/:userId` | Remove a non-lead member with no assigned stories |
| GET | `/projects/:projectId/stories` | List a project's stories with assigned member names |
| POST | `/projects/:projectId/stories` | Create a story (`title`, `description`, `priority`, `assigned_user_id`) |
| PUT | `/projects/:projectId/stories/:storyId` | Save an edited story (all editable fields, including `status`) |
| DELETE | `/projects/:projectId/stories/:storyId` | Delete a story |

Story edits and deletes match on **both** the story id and the project id, so a story can only
be changed through its own project.

## Validation and error handling

| Status | When |
|---|---|
| 400 | Empty or non-text fields, invalid project status, story priority, or story status, invalid assigned member id, or assigning someone who isn't a member of the project |
| 404 | Project, story, user, or Project Lead not found |
| 409 | User is already a member, or removing a member who still has assigned stories in that project (Done stories included) |
| 403 | Attempt to remove the Project Lead |
| 500 | Database or server error |

Stories assigned in a *different* project do not block removal from the selected project.
The frontend shows each result in a green (success) or red (error) message.

## Project structure
```
server/server.js                  Express routes + MongoDB
client/src/projectHelper.js       fetch helpers for all requests
client/src/components/
  Signup.jsx, Login.jsx           PA2
  createProject.jsx               Create Project form
  ProjectList.jsx                 Project list
  ManageMembers.jsx               Membership management
  Backlog.jsx                     PA4: project selector, loads stories + members, edit/delete
  StoryForm.jsx                   PA4: create or edit a story
  StoryList.jsx                   PA4: story cards with details, edit, and delete buttons
```
