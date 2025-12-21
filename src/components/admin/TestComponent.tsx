import React, { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

const TestComponent: React.FC = () => {
  const [result, setResult] = useState<string>("");

  const handleTest = async () => {
    try {
      const auth = getAuth();
      const functions = getFunctions();

      // 1. Sign in as admin (use your real admin email & password here)
      const adminEmail = "nextgenskills96@gmail.com";
      const adminPassword = "tinevimbo";

      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

      // 2. Refresh token to ensure custom claims are included
      await auth.currentUser?.getIdToken(true);

      // 3. Call your createUserProfile function
      const createUserProfile = httpsCallable(functions, "createUserProfile");

      const res: any = await createUserProfile({
        email: "student1@example.com",
        password: "test1234",
        name: "Student One",
        role: "student",
      });

      console.log("Function result:", res.data);
      setResult(JSON.stringify(res.data));
    } catch (error: any) {
      console.error("Error calling function:", error);
      setResult(`Error: ${error.message}`);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Test Cloud Function</h2>
      <button
        onClick={handleTest}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Run Test
      </button>
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
};

export default TestComponent;
