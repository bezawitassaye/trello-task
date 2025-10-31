import { useState, useEffect } from "react";
import { FolderIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "react-toastify";

// ------------------- Types -------------------
interface Member {
  userId: number;
  role: string;
  joinedAt: string;
}

interface Workspace {
  id: number;
  name: string;
  createdBy: number;
  createdAt: string;
  members: Member[];
}

// ------------------- Hook to fetch workspaces -------------------
const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchWorkspaces = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Token not found. Please login.");
        setLoading(false);
        return;
      }

      try {
        const query = `
          query GetAllWorkspaces($adminToken: String!) {
            getAllWorkspaces(adminToken: $adminToken) {
              id
              name
              createdBy
              createdAt
              members { userId role joinedAt }
            }
          }
        `;
        const variables = { adminToken: token };
        const res = await axios.post(
          "http://localhost:4000/graphql",
          { query, variables },
          { headers: { "Content-Type": "application/json" } }
        );

        if (res.data.errors) throw new Error(res.data.errors[0].message);

        setWorkspaces(res.data.data.getAllWorkspaces);
      } catch (err: any) {
        setError(err.message || "Failed to fetch workspaces");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  return { workspaces, setWorkspaces, loading, error };
};

// ------------------- Main Sidebar Component -------------------
const Sidebar = () => {
  const { workspaces, setWorkspaces, loading, error } = useWorkspaces();
  const [showModal, setShowModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");

  const createWorkspace = async () => {
  if (!workspaceName.trim()) return toast.error("Workspace name required");

  const token = localStorage.getItem("token");
  if (!token) return toast.error("Token not found. Please login.");

  try {
    const mutation = `
      mutation {
        createWorkspace(name: "${workspaceName}", token: "${token}") {
          id
          name
          createdBy
          createdAt
          members { userId role joinedAt }
        }
      }
    `;

    const res = await axios.post(
      "http://localhost:4000/graphql",
      { query: mutation },
      { headers: { "Content-Type": "application/json" } }
    );

    if (res.data.errors) throw new Error(res.data.errors[0].message);

    setWorkspaces((prev) => [...prev, res.data.data.createWorkspace]);
    toast.success("Workspace created!");
    setWorkspaceName("");
    setShowModal(false);
  } catch (err: any) {
    toast.error(err.message || "Failed to create workspace");
  }
};


  return (
    <aside className="w-64 bg-[#0f172a] border-r border-gray-800 flex flex-col">
      <div className="p-4 font-semibold text-lg">Workspace</div>

      <div className="flex-1 overflow-y-auto px-3">
        {loading && <p className="text-gray-400">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {workspaces.map((w) => (
          <div
            key={w.id}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-lg cursor-pointer"
          >
            <FolderIcon className="w-5 h-5 text-gray-400" />
            <span className="truncate">{w.name}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="m-4 bg-indigo-600 py-2 rounded-lg text-sm hover:bg-indigo-500 flex items-center justify-center gap-1"
      >
        <PlusCircleIcon className="w-5 h-5" /> New Workspace
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-80">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">Create Workspace</h2>
            <input
              type="text"
              placeholder="Workspace name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full p-2 rounded mb-4 bg-gray-800 text-gray-200 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={createWorkspace}
                className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
