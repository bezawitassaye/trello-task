import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const query = `
        mutation Signup($name: String!, $email: String!, $password: String!) {
          signup(name: $name, email: $email, password: $password) {
            token
            user {
              id
              name
              email
            }
          }
        }
      `;

      const variables = { ...form };

      const res = await axios.post(
        "http://localhost:4000/graphql",
        { query, variables },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data.errors) throw new Error(res.data.errors[0].message);

      const { token } = res.data.data.signup;
      localStorage.setItem("token", token); // store token

      toast.success("Signup successful! Redirecting...");
      navigate("/home"); // redirect to dashboard
    } catch (err: any) {
      setError(err.message || "Signup failed");
      toast.error(err.message || "Signup failed");
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#111827] text-gray-200">
      <div className="bg-[#1f2937] p-8 rounded-2xl w-[400px] shadow-lg">
        <h2 className="text-2xl font-semibold text-center mb-6">Create Account</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full bg-gray-800 p-3 rounded-lg ring-2 ring-indigo-800 focus:ring-indigo-600 focus:outline-none transition"
            />

          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="text"
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
              type="text"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full bg-gray-800 p-3 rounded-lg ring-2 ring-indigo-800 focus:ring-indigo-600 focus:outline-none transition"
            />

          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 py-2 rounded-lg hover:bg-indigo-500"
          >
            Sign Up
          </button>
        </form>
        <p className="text-sm text-center mt-4 text-gray-400">
          Already have an account?{" "}
          <Link to="/" className="text-indigo-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
