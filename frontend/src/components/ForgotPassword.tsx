import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Email is required");

    setLoading(true);

    try {
      // Call your backend forgotPassword endpoint
      const res = await axios.post("http://localhost:4000/api/auth/forgot-password", { email });

      toast.success(res.data.message || "Password reset link sent! Check console (mock).");

      // Optional: navigate to login page after some delay
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to send reset link");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#111827] text-gray-200">
      <div className="bg-[#1f2937] p-8 rounded-2xl w-[400px] shadow-lg">
        <h2 className="text-2xl font-semibold text-center mb-6">Forgot Password</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your registered email"
              className="w-full bg-gray-800 p-3 rounded-lg ring-2 ring-indigo-800 focus:ring-indigo-600 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg ${loading ? "bg-gray-500" : "bg-indigo-600 hover:bg-indigo-500"}`}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-400">
          Remembered your password?{" "}
          <Link to="/login" className="text-indigo-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
