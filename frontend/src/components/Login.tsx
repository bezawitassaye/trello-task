import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
const Login = () => {
    const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post("http://localhost:4000/api/auth/login", form);

      if (res.status !== 200) {
        setError(res.data.message || "Login failed");
        toast.error(res.data.message || "Login failed");
        return;
      }

      const { accessToken } = res.data;
      localStorage.setItem("token", accessToken);

      toast.success("Login successful! Redirecting...");
      setTimeout(() => navigate("/home"), 1500); // redirect after 1.5s
    } catch (err) {
      setError("Login failed. Please check your credentials.");
      toast.error("Login failed. Please check your credentials.");
      console.error(err);
    }
  };


  return (
    <div className="flex h-screen items-center justify-center bg-[#111827] text-gray-200">
      <div className="bg-[#1f2937] p-8 rounded-2xl w-[400px] shadow-lg">
        <h2 className="text-2xl font-semibold text-center mb-6">Welcome Back</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full bg-gray-800 p-3 rounded-lg ring-2 ring-indigo-800 focus:ring-indigo-600 focus:outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full bg-gray-800 p-3 rounded-lg ring-2 ring-indigo-800 focus:ring-indigo-600 focus:outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 py-2 rounded-lg hover:bg-indigo-500 transition"
          >
            Login
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-400">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-indigo-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
