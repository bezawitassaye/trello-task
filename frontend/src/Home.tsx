import { useState, useEffect } from "react";
import Sidebar from "./components/Side";
import axios from "axios";
import { toast } from "react-toastify";

const Home = () => {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);

  // Fetch workspace and projects when selected
  useEffect(() => {
    if (!selectedWorkspaceId) return;

    const token = localStorage.getItem("token");
    if (!token) return toast.error("Token not found");

    const fetchWorkspaceAndProjects = async () => {
      try {
        // Workspace info
        const workspaceQuery = `
          query {
            getWorkspace(workspaceId: ${selectedWorkspaceId}, token: "${token}") {
              id
              name
              createdBy
              createdAt
              members { userId role joinedAt }
            }
          }
        `;
        const wsRes = await axios.post("http://localhost:4000/graphql", { query: workspaceQuery });
        if (wsRes.data.errors) throw new Error(wsRes.data.errors[0].message);
        setWorkspace(wsRes.data.data.getWorkspace);

        // Projects
        const projectsQuery = `
          query {
            getProjectsByWorkspace(workspaceId: ${selectedWorkspaceId}) {
              id
    name
    createdBy
    members {
      userId
      name
      role
    }
            }
          }
        `;
        const prRes = await axios.post("http://localhost:4000/graphql", { query: projectsQuery });
        if (prRes.data.errors) throw new Error(prRes.data.errors[0].message);
        console.log("Projects API response:", prRes.data.data.getProjectsByWorkspace);

        setProjects(prRes.data.data.getProjectsByWorkspace);
      } catch (err: any) {
        toast.error(err.message || "Failed to fetch workspace/projects");
      }
    };

    fetchWorkspaceAndProjects();
  }, [selectedWorkspaceId]);

  // Invite a member
  const inviteMember = async (email: string) => {
    if (!workspace) return;
    const token = localStorage.getItem("token");
    const mutation = `
      mutation {
        addWorkspaceMemberByEmail(workspaceId: ${workspace.id}, email: "${email}", role: "MEMBER", token: "${token}") {
          userId
          role
          joinedAt
        }
      }
    `;
    try {
      const res = await axios.post("http://localhost:4000/graphql", { query: mutation });
      if (res.data.errors) throw new Error(res.data.errors[0].message);
      toast.success("Member invited!");
      setWorkspace((prev: any) => ({
        ...prev,
        members: [...prev.members, res.data.data.addWorkspaceMemberByEmail],
      }));
    } catch (err: any) {
      toast.error(err.message || "Failed to invite member");
    }
  };

  // Remove a member
  const removeMember = async (userId: number) => {
    if (!workspace) return;
    const token = localStorage.getItem("token");
    const mutation = `
      mutation {
        removeWorkspaceMember(workspaceId: ${workspace.id}, userId: ${userId}, token: "${token}")
      }
    `;
    try {
      const res = await axios.post("http://localhost:4000/graphql", { query: mutation });
      if (res.data.errors) throw new Error(res.data.errors[0].message);
      toast.success("Member removed!");
      setWorkspace((prev: any) => ({
        ...prev,
        members: prev.members.filter((m: any) => m.userId !== userId),
      }));
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  // Update a member role
  const updateMemberRole = async (userId: number, role: "MEMBER" | "VIEWER") => {
    if (!workspace) return;
    const token = localStorage.getItem("token");
    const mutation = `
      mutation {
        updateWorkspaceMemberRole(workspaceId: ${workspace.id}, userId: ${userId}, role: "${role}", token: "${token}")
      }
    `;
    try {
      const res = await axios.post("http://localhost:4000/graphql", { query: mutation });
      if (res.data.errors) throw new Error(res.data.errors[0].message);
      toast.success("Role updated!");
      setWorkspace((prev: any) => ({
        ...prev,
        members: prev.members.map((m: any) =>
          m.userId === userId ? { ...m, role } : m
        ),
      }));
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    }
  };

  // Create project
  const createProject = async () => {
    if (!workspace) return;
    const name = prompt("Enter project name");
    if (!name) return;

    const token = localStorage.getItem("token");
    if (!token) return toast.error("Token not found");

    try {
      const mutation = `
        mutation {
          createProject(workspaceId: ${workspace.id}, name: "${name}", token: "${token}") {
            id
            name
            createdBy
            createdAt
            members { userId role joinedAt }
          }
        }
      `;
      const res = await axios.post("http://localhost:4000/graphql", { query: mutation });
      if (res.data.errors) throw new Error(res.data.errors[0].message);

      setProjects(prev => [res.data.data.createProject, ...prev]);
      toast.success("Project created!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    }
  };

  return (
    <div className="flex h-screen bg-[#111827] text-gray-200">
      <Sidebar onSelectWorkspace={setSelectedWorkspaceId} />

      <main className="flex-1 p-6 overflow-x-auto">
        {workspace ? (
          <>
            {/* Workspace header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold">{workspace.name}</h1>
              <div className="flex flex-row gap-4">
                <button
                  className="bg-gray-800 px-4 py-2 rounded-lg text-sm"
                  onClick={() => inviteMember(prompt("Enter email") || "")}
                >
                  + Invite Member
                </button>
                <button
                  className="bg-blue-600 px-4 py-2 rounded-lg text-sm"
                  onClick={createProject}
                >
                  + Create Project
                </button>
              </div>
            </div>

            {/* Workspace members */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {workspace.members.map((m: any, i: number) => (
                <div
                  key={i}
                  className="px-3 py-1 bg-gray-800 rounded-full text-sm flex items-center gap-2"
                >
                  {m.userId ? `User ${m.userId}` : "Pending"} ({m.role})
                  {m.role !== "OWNER" && (
                    <>
                      <button
                        className="bg-red-600 px-2 py-1 rounded text-xs"
                        onClick={() => removeMember(m.userId)}
                      >
                        Remove
                      </button>
                      <select
                        value={m.role}
                        onChange={(e) => updateMemberRole(m.userId, e.target.value as any)}
                        className="bg-gray-700 text-xs rounded px-1"
                      >
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Projects */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {projects.map((project) => (
    <div key={project.id} className="bg-gray-800 p-4 rounded-lg">
      <h2 className="font-semibold mb-2">{project.name}</h2>
      <p className="text-sm text-gray-400 mb-2">
        Created by {project.creatorName}
      </p>
      <div className="flex flex-wrap gap-2">
        {project.members.map((m: any) => (
          <span key={m.userId} className="px-2 py-1 bg-gray-700 rounded text-xs">
            {m.name} ({m.role})
          </span>
        ))}
      </div>
    </div>
  ))}
</div>

          </>
        ) : (
          <p className="text-gray-400">Select a workspace from the sidebar</p>
        )}
      </main>
    </div>
  );
};

export default Home;
