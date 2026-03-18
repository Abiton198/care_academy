import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebaseConfig";

const functions = getFunctions(app);

// 🎯 Update: Accept 'data' as an argument
export const activateTeacher = async (data: { 
  uid: string; 
  email: string; 
  firstName: string; 
  lastName: string 
}) => {
  const approveTeacher = httpsCallable(functions, "approveTeacherProfile");

  // Pass the dynamic data object to the Cloud Function
  const result = await approveTeacher(data);

  console.log("Cloud Function Response:", result.data);
  return result.data; 
};