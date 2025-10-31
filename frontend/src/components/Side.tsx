import { useState, useEffect } from "react";
import { FolderIcon, PlusCircleIcon, UserCircleIcon } from "@heroicons/react/24/outline";
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
          query GetUserWorkspaces($token: String!) {
            getUserWorkspaces(token: $token) {
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
        `;
        const variables = { token };
        const res = await axios.post(
          "http://localhost:4000/graphql",
          { query, variables },
          { headers: { "Content-Type": "application/json" } }
        );

        if (res.data.errors) throw new Error(res.data.errors[0].message);
        setWorkspaces(res.data.data.getUserWorkspaces);
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

// ------------------- Sidebar Component -------------------
interface SidebarProps {
  onSelectWorkspace: (workspaceId: number) => void;
}

const Sidebar = ({ onSelectWorkspace }: SidebarProps) => {
  const { workspaces, setWorkspaces, loading, error } = useWorkspaces();
  const [showModal, setShowModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [userName, setUserName] = useState("");
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  // Password update modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Fetch logged-in user info
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const query = `
          query {
            getUserProfile(token: "${token}") {
              id
              name
              email
            }
          }
        `;
        const res = await axios.post("http://localhost:4000/graphql", { query }, {
          headers: { "Content-Type": "application/json" }
        });
        if (res.data.errors) throw new Error(res.data.errors[0].message);
        const user = res.data.data.getUserProfile;
        setUserName(user.name.split(" ")[0]);
      } catch {
        setUserName("User");
      }
    };
    fetchUser();
  }, []);

  // ------------------- Create Workspace -------------------
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
      const res = await axios.post("http://localhost:4000/graphql", { query: mutation }, {
        headers: { "Content-Type": "application/json" }
      });

      if (res.data.errors) throw new Error(res.data.errors[0].message);

      setWorkspaces(prev => [...prev, res.data.data.createWorkspace]);
      toast.success("Workspace created!");
      setWorkspaceName("");
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace");
    }
  };

  // ------------------- Logout -------------------
  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      await axios.post("http://localhost:4000/api/auth/logout", { refreshToken });
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      toast.success("Logged out successfully");
      window.location.href = "/";
    } catch (err: any) {
      toast.error("Failed to logout");
    }
  };

  // ------------------- Update Password -------------------
  // ------------------- Update Password -------------------
  const handleUpdatePassword = async () => {
    const token = localStorage.getItem("token");
    console.log(token) // get token from localStorage
    if (!token) return toast.error("Reset token not found. Please request a password reset first.");
    if (!newPassword.trim()) return toast.error("New password is required");

    try {
      const mutation = `
      mutation UpdatePassword($token: String!, $newPassword: String!) {
        updatePassword(token: $token, newPassword: $newPassword)
      }
    `;
      const variables = { token, newPassword };

      const res = await axios.post("http://localhost:4000/graphql", { query: mutation, variables }, {
        headers: { "Content-Type": "application/json" }
      });

      if (res.data.errors) throw new Error(res.data.errors[0].message);

      toast.success(res.data.data.updatePassword);
      setNewPassword("");
      setShowUpdateModal(false);
      localStorage.removeItem("resetToken"); // remove token after success
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    }
  };


  return (
    <aside className="w-64 bg-[#0f172a] border-r border-gray-800 flex flex-col">
      {/* Title */}
      <div className="p-4 font-semibold text-lg text-gray-100">Workspace</div>

      {/* Workspaces List */}
      <div className="flex-1 overflow-y-auto px-3">
        {loading && <p className="text-gray-400">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {workspaces.map((w) => (
          <div
            key={w.id}
            onClick={() => onSelectWorkspace(w.id)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-lg cursor-pointer"
          >
            <FolderIcon className="w-5 h-5 text-gray-400" />
            <span className="truncate text-gray-200">{w.name}</span>
          </div>
        ))}
      </div>

      {/* Create Workspace Button */}
      <button
        onClick={() => setShowModal(true)}
        className="m-4 bg-indigo-600 py-2 rounded-lg text-sm hover:bg-indigo-500 flex items-center justify-center gap-1"
      >
        <PlusCircleIcon className="w-5 h-5" /> New Workspace
      </button>

      {/* User Profile + Logout */}
      <div className="relative border-t border-gray-800 p-4 flex items-center justify-between">
        <div className="text-gray-300 text-sm">{userName}</div>
        <div className="relative">
          <UserCircleIcon
            className="w-8 h-8 text-gray-300 cursor-pointer hover:text-white"
            onClick={() => setShowLogoutMenu(!showLogoutMenu)}
          />
          {showLogoutMenu && (
            <div className="absolute right-0 bottom-10 bg-gray-800 rounded-md shadow-lg w-36 py-2 flex flex-col">
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
              >
                Logout
              </button>
              <button
                onClick={() => setShowUpdateModal(true)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
              >
                Update Password
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Workspace Creation */}
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

      {/* Modal for Update Password */}
      {/* Modal for Update Password */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-80">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">Update Password</h2>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 rounded mb-4 bg-gray-800 text-gray-200 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePassword}
                className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

    </aside>
  );
};

export default Sidebar;
