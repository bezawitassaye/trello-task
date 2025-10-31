# trello-task
clone the project then 

run cd backend

run ### bun install

run bun run src/server.ts
 USER 

#goto http://localhost:4000/graphql  
#for sign up run
  mutation {
  signup(name: "user", email: "user@example.com", password: "1234") {
    token
    user {
      id
      name
      email
    }
  }
}

for forgote password run 

mutation {
  forgotPassword(email: "user@example.com")
}

then you will get token with in the link  in the console then copy token 

mutation {
  updatePassword(token: "Past_TOKEN_HERE", newPassword: "newPassword123")
}

for user ban run 
mutation {
  banUser(adminToken: "ADMIN_JWT_TOKEN", userId: 3)
}
to get admin token run 
#goto http://localhost:4000/login in postman or tunderclient run
{
  "email": "admin@gmail.com",
  "password": "A1567@"
}

for unban user 
mutation {
  unbanUser(adminToken: "ADMIN_JWT_TOKEN", userId: 3)
}
to get admin token run 
#goto http://localhost:4000/login in postman or tunderclient run
{
  "email": "admin@gmail.com",
  "password": "A1567@"
}


for rest password by admin
mutation {
  adminResetPassword(
    adminToken: "ADMIN_JWT_TOKEN",
    userId: 3,
    newPassword: "resetByAdmin123"
  )
}
to get admin token run 
#goto http://localhost:4000/login in postman or tunderclient run
{
  "email": "admin@gmail.com",
  "password": "A1567@"
}


for update user password 
mutation {
  updatePassword(
    token: "USER_SIGN_UP_OR_LOGIN_TOKEN", 
    newPassword: "5678"
  )
}




#goto http://localhost:4000/login in postman or tunderclient 
#for login run 

{
  "email": "Beza@gmail.com",
  "password": "1234"
}

FOR LOGOUT #goto http://localhost:4000/logout in postman or tunderclient 

{
"refreshToken":"USER_TOKEN"
}

FOR refresh #goto http://localhost:4000/refresh in postman or tunderclient 

{
"refreshToken":"USER_TOKEN"
}





 workspace 

 
#goto http://localhost:4000/graphql  
for create workspace

mutation {
  createWorkspace(name: "My First Workspace", token: "YOUR_TOKEN_HERE") {
    id
    name
    createdBy
    createdAt
    members {
      userId
      role
      joinedAt
    }
  }
}
for Add a Workspace Member (by Email) 

mutation {
  addWorkspaceMemberByEmail(
    workspaceId: 1,
    email: "member@example.com",
    role: "MEMBER",
    token: "OWNER_TOKEN_HERE"
  ) {
    userId
    role
    joinedAt
  }
}

for  Remove Member:

mutation {
  removeWorkspaceMember(workspaceId: 1, userId: 2, token: "OWNER_TOKEN_HERE")
}

for update role 
mutation {
  updateWorkspaceMemberRole(workspaceId: 1, userId: 2, role: "VIEWER", token: "OWNER_TOKEN_HERE")
}

for get workspace

query {
  getWorkspace(workspaceId: 1, token: "MEMBER_OR_OWNER_TOKEN") {
    id
    name
    members {
      userId
      role
      joinedAt
    }
  }
}

for Admin View — Get All Workspaces
query {
  getAllWorkspaces(adminToken: "ADMIN_USER_TOKEN") {
    id
    name
    members {
      userId
      role
    }
  }
}
for create Projects inside Workspaces
mutation {
  createProject(workspaceId: 1, name: "Project Alpha", token: "WORKSPACE_MEMBER_TOKEN") {
    id
    name
    workspaceId
    members {
      userId
      role
    }
  }
}


Task 


for create task 
mutation {
  createTask(
    projectId: 1,
    title: "Design Homepage",
    description: "Create a landing page layout with responsive grid.",
    assignedToIds: [2, 3],
    token: "YOUR_VALID_TOKEN"
  ) {
    id
    title
    description
    assignedToIds
  }
}

for update task
mutation {
  updateTask(
    taskId: 1,
    status: "IN_PROGRESS",
    token: "YOUR_VALID_TOKEN"
  ) {
    id
    title
    status
  }
}
for AI GENERATE TASK 
mutation {
  generateTasksFromPrompt(
    projectId: 11,  # Your project ID
    prompt: "Create tasks for the new landing page project",
    token: "YOUR_LOGIN_TOKEN_HERE"
  ) {
    id
    title
    description
    status
  }
}


for ai sumerized 
query {
  summarizeTask(taskId: 1)  # Replace with a real task ID
}










