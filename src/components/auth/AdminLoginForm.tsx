import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const AdminLoginForm: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const loggedUser = await login(email, password);

      // Verify user is admin
      const token = await loggedUser.getIdTokenResult();
      if (token.claims.role !== "admin") {
        throw new Error("You are not authorized as admin.");
      }

      navigate("/admin-dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);

    try {
      const loggedUser = await loginWithGoogle();

      // Verify user is admin
      const token = await loggedUser.getIdTokenResult();
      if (token.claims.role !== "admin") {
        throw new Error("You are not authorized as admin.");
      }

      navigate("/admin-dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Email/Password login */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-4 text-center text-gray-500 text-sm">or</div>

          {/* Google Login */}
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLoginForm;
