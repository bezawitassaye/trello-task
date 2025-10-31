// src/graphql/project/projectResolvers.ts
import { verifyToken } from "../../auth/jwt";
import pool from "../../db";
import { logSecurity, logInfo } from "../../utils/logger";


type MyJwtPayload = {
  userId: number;
  email?: string;
  role?: string;
};

interface CreateProjectArgs {
  workspaceId: number;
  name: string;
  token: string;
}

interface UpdateProjectArgs {
  projectId: number;
  name?: string;
  token: string;
}

interface DeleteProjectArgs {
  projectId: number;
  token: string;
}

interface UpdateProjectMemberRoleArgs {
  projectId: number;
  userId: number;
  newRole: string;
  token: string;
}

interface RemoveProjectMemberArgs {
  projectId: number;
  userId: number;
  token: string;
}

export const projectResolvers = {
  // Create a project (creator becomes PROJECT_LEAD)
   createProject: async ({ workspaceId, name, token }: CreateProjectArgs) => {
    const decoded = verifyToken(token) as MyJwtPayload;

    // 1️⃣ Ensure user is part of workspace
    const { rows: wm } = await pool.query(
      "SELECT * FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",
      [workspaceId, decoded.userId]
    );
    if (!wm.length) {
      await logSecurity(decoded.userId, null, "CREATE_PROJECT_FAILED", { workspaceId, reason: "Not a workspace member" });
      throw new Error("Not a workspace member");
    }

    // 2️⃣ Insert project record
    const { rows: pRows } = await pool.query(
      `INSERT INTO projects (name, workspace_id, created_by, created_at)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [name, workspaceId, decoded.userId]
    );
    const project = pRows[0];

    // 3️⃣ Add creator as Project Lead
    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role, joined_at)
       VALUES ($1, $2, 'PROJECT_LEAD', NOW())`,
      [project.id, decoded.userId]
    );

    // 4️⃣ Add all workspace members as contributors
    const { rows: workspaceMembers } = await pool.query(
      `SELECT user_id FROM workspace_members WHERE workspace_id = $1`,
      [workspaceId]
    );

    for (const member of workspaceMembers) {
      if (member.user_id !== decoded.userId) {
        await pool.query(
          `INSERT INTO project_members (project_id, user_id, role, joined_at)
           VALUES ($1, $2, 'CONTRIBUTOR', NOW())`,
          [project.id, member.user_id]
        );
      }
    }

    // 5️⃣ Log project creation
    await logSecurity(decoded.userId, null, "PROJECT_CREATED", { projectId: project.id, workspaceId });

    // 6️⃣ Return GraphQL-friendly response
    return {
      id: project.id,
      workspaceId: project.workspace_id,
      name: project.name,
      createdBy: project.created_by,
      createdAt: project.created_at,
      members: [
        {
          userId: decoded.userId,
          role: "PROJECT_LEAD",
          joinedAt: new Date().toISOString(),
        },
        ...workspaceMembers
          .filter((m) => m.user_id !== decoded.userId)
          .map((m) => ({
            userId: m.user_id,
            role: "CONTRIBUTOR",
            joinedAt: new Date().toISOString(),
          })),
      ],
    };
  },

  updateProject: async ({ projectId, name, token }: UpdateProjectArgs) => {
    const decoded = verifyToken(token) as MyJwtPayload;

    const { rows: projectRows } = await pool.query("SELECT * FROM projects WHERE id=$1", [projectId]);
    if (!projectRows.length) {
      await logSecurity(decoded.userId, null, "UPDATE_PROJECT_FAILED", { projectId, reason: "Project not found" });
      throw new Error("Project not found");
    }
    const project = projectRows[0];

    // Check workspace owner
    const { rows: ownerRows } = await pool.query(
      "SELECT * FROM workspace_members WHERE workspace_id=$1 AND user_id=$2 AND role='OWNER'",
      [project.workspace_id, decoded.userId]
    );

    const { rows: projMemberRows } = await pool.query(
      "SELECT * FROM project_members WHERE project_id=$1 AND user_id=$2",
      [projectId, decoded.userId]
    );

    const isOwner = !!ownerRows.length;
    const isProjectLead = !!projMemberRows.length && projMemberRows[0].role === "PROJECT_LEAD";
    if (!isOwner && !isProjectLead) {
      await logSecurity(decoded.userId, null, "UPDATE_PROJECT_FAILED", { projectId, reason: "Unauthorized" });
      throw new Error("Unauthorized: must be workspace owner or project lead");
    }

    const { rows: updatedRows } = await pool.query(
      `UPDATE projects SET name = COALESCE($1, name) WHERE id = $2 RETURNING *`,
      [name, projectId]
    );
    const updated = updatedRows[0];

    await logSecurity(decoded.userId, null, "PROJECT_UPDATED", { projectId: updated.id, newName: name });

    const { rows: members } = await pool.query(
      "SELECT user_id, role, joined_at FROM project_members WHERE project_id=$1",
      [projectId]
    );

    return {
      id: updated.id,
      workspaceId: updated.workspace_id,
      name: updated.name,
      createdBy: updated.created_by,
      createdAt: updated.created_at,
      members: members.map((m: any) => ({
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
      })),
    };
  },

  deleteProject: async ({ projectId, token }: DeleteProjectArgs) => {
    const decoded = verifyToken(token) as MyJwtPayload;

    const { rows: projectRows } = await pool.query("SELECT * FROM projects WHERE id=$1", [projectId]);
    if (!projectRows.length) {
      await logSecurity(decoded.userId, null, "DELETE_PROJECT_FAILED", { projectId, reason: "Project not found" });
      throw new Error("Project not found");
    }
    const project = projectRows[0];

    const { rows: ownerRows } = await pool.query(
      "SELECT * FROM workspace_members WHERE workspace_id=$1 AND user_id=$2 AND role='OWNER'",
      [project.workspace_id, decoded.userId]
    );

    const { rows: leadRows } = await pool.query(
      "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
      [projectId, decoded.userId]
    );

    const isOwner = !!ownerRows.length;
    const isLead = !!leadRows.length && leadRows[0].role === "PROJECT_LEAD";
    if (!isOwner && !isLead) {
      await logSecurity(decoded.userId, null, "DELETE_PROJECT_FAILED", { projectId, reason: "Unauthorized" });
      throw new Error("Unauthorized: must be workspace owner or project lead");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM task_assignments WHERE task_id IN (SELECT id FROM tasks WHERE project_id=$1)", [projectId]);
      await client.query("DELETE FROM notifications WHERE related_entity_id IN (SELECT id FROM tasks WHERE project_id=$1)", [projectId]);
      await client.query("DELETE FROM tasks WHERE project_id=$1", [projectId]);
      await client.query("DELETE FROM project_members WHERE project_id=$1", [projectId]);
      await client.query("DELETE FROM projects WHERE id=$1", [projectId]);
      await client.query("COMMIT");

      await logSecurity(decoded.userId, null, "PROJECT_DELETED", { projectId });
    } catch (err) {
      await client.query("ROLLBACK");
      await logSecurity(decoded.userId, null, "DELETE_PROJECT_ERROR", { projectId, error: err });
      throw err;
    } finally {
      client.release();
    }

    return { success: true, message: `Project ${projectId} deleted` };
  },

  


  // Update project member role (PROJECT_LEAD can change roles)
  updateProjectMemberRole: async (
    _: any,
    { projectId, userId, newRole, token }: UpdateProjectMemberRoleArgs
  ) => {
    const decoded = verifyToken(token) as MyJwtPayload;

    // verify requester is PROJECT_LEAD
    const { rows: requesterRows } = await pool.query(
      "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
      [projectId, decoded.userId]
    );
    if (!requesterRows.length || requesterRows[0].role !== "PROJECT_LEAD") {
      throw new Error("Unauthorized: only project leads can change roles");
    }

    // validate newRole (optional): ensure matches your enum values
    const allowed = ["PROJECT_LEAD", "CONTRIBUTOR", "PROJECT_VIEWER"];
    if (!allowed.includes(newRole)) throw new Error("Invalid role");

    const { rows } = await pool.query(
      "UPDATE project_members SET role=$1 WHERE project_id=$2 AND user_id=$3 RETURNING *",
      [newRole, projectId, userId]
    );

    if (!rows.length) throw new Error("Member not found");

    return {
      projectId,
      userId,
      newRole: rows[0].role,
    };
  },

  // Remove a project member
  removeProjectMember: async (
    _: any,
    { projectId, userId, token }: RemoveProjectMemberArgs
  ) => {
    const decoded = verifyToken(token) as MyJwtPayload;

    // verify requester is PROJECT_LEAD
    const { rows: requesterRows } = await pool.query(
      "SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2",
      [projectId, decoded.userId]
    );
    if (!requesterRows.length || requesterRows[0].role !== "PROJECT_LEAD") {
      throw new Error("Unauthorized: only project leads can remove members");
    }

    // prevent removing self (optional)
    if (decoded.userId === userId) throw new Error("Project leads cannot remove themselves");

    // delete membership
    await pool.query("DELETE FROM project_members WHERE project_id=$1 AND user_id=$2", [projectId, userId]);

    // optional: also remove task assignments for that user in this project
    await pool.query(
      `DELETE FROM task_assignments WHERE task_id IN (SELECT id FROM tasks WHERE project_id=$1) AND user_id=$2`,
      [projectId, userId]
    );

    return { success: true, message: `User ${userId} removed from project ${projectId}` };
  },
  // Get all projects for a workspace
getProjectsByWorkspace: async ({ workspaceId }: { workspaceId: number }) => {
  try {
    if (!workspaceId) throw new Error("workspaceId is required");

    // 1️⃣ Get projects
    const { rows: projects } = await pool.query(
      "SELECT * FROM projects WHERE workspace_id=$1 ORDER BY created_at DESC",
      [workspaceId]
    );

    const projectsWithMembers = [];

    for (const project of projects) {
      // 2️⃣ Get project members (just IDs + roles)
      const { rows: memberRows } = await pool.query(
        "SELECT user_id, role, joined_at FROM project_members WHERE project_id=$1",
        [project.id]
      );

      // 3️⃣ Fetch member names from users table
      const members = [];
      for (const m of memberRows) {
        const { rows: userRows } = await pool.query(
          "SELECT name FROM users WHERE id=$1",
          [m.user_id]
        );
        members.push({
          userId: m.user_id,
          name: userRows[0]?.name || `User ${m.user_id}`,
          role: m.role,
        });
      }

      // 4️⃣ Fetch project creator name
      const { rows: creatorRows } = await pool.query(
        "SELECT name FROM users WHERE id=$1",
        [project.created_by]
      );
      const creatorName = creatorRows[0]?.name || `User ${project.created_by}`;

      // 5️⃣ Return project info including creator in members list if you want
      projectsWithMembers.push({
        id: project.id,
        name: project.name,
        createdBy: project.created_by, // keep as ID
        creatorName,                   // add this for easy access in frontend
        members,
      });
    }

    return projectsWithMembers;
  } catch (err: any) {
    console.error("Error in getProjectsByWorkspace:", err.stack || err);
    throw new Error("Failed to fetch projects");
  }
}





};

export default projectResolvers;
