"use client";

import { useState, useEffect } from "react";
import { db, auth, storage } from "@/lib/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// 🎨 Generate consistent color
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

// 🅰️ Get initials
function getInitials(name: string, email: string) {
  if (name) {
    const parts = name.split(" ");
    return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0];
  }
  return email ? email[0] : "?";
}

interface ProfileSettingsProps {
  onProfileUpdate?: (updated: { title: string; firstName: string }) => void;
}

export default function ProfileSettings({ onProfileUpdate }: ProfileSettingsProps) {
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [children, setChildren] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const user = auth.currentUser;

  // 🔹 Load profile + children
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const parentRef = doc(db, "parents", user.uid);
        const parentSnap = await getDoc(parentRef);

        if (parentSnap.exists()) {
          const data = parentSnap.data();
          setTitle(data.title || "");
          setFirstName(data.firstName || "");
          setLastName(data.lastName || "");
          setContact(data.contact || "");
          setEmail(data.email || user.email || "");
          setAddress(data.address || "");
          setPhotoURL(data.photoURL || "");
        } else {
          setEmail(user.email || "");
        }

        // fetch children registered by this parent
        const q = query(
          collection(db, "registrations"),
          where("parentId", "==", user.uid)
        );
        const snap = await getDocs(q);
        setChildren(snap.docs.map((doc) => doc.data().learnerData || {}));
      } catch (err) {
        console.error("Error loading profile:", err);
      }
      setLoading(false);
    };

    loadProfile();
  }, [user]);

  // 🔹 Upload profile picture
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    setUploading(true);

    try {
      const file = e.target.files[0];
      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      setPhotoURL(url);
      await setDoc(
        doc(db, "parents", user.uid),
        { photoURL: url, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      console.error("Error uploading picture:", err);
      alert("Failed to upload picture ❌");
    }

    setUploading(false);
  };

  // 🔹 Remove profile picture
  const handleRemovePicture = async () => {
    if (!user) return;
    try {
      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      await deleteObject(storageRef).catch(() => {});

      setPhotoURL("");
      await setDoc(
        doc(db, "parents", user.uid),
        { photoURL: "", updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      console.error("Error removing picture:", err);
      alert("Failed to remove picture ❌");
    }
  };

  // 🔹 Save updated profile
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await setDoc(
        doc(db, "parents", user.uid),
        {
          title,
          firstName,
          lastName,
          contact,
          address,
          photoURL,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 🔥 instantly update dashboard welcome
      if (onProfileUpdate) {
        onProfileUpdate({ title, firstName });
      }

      alert("Profile updated successfully ✅");
      setEditing(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile ❌");
    }

    setSaving(false);
  };

  if (loading) return <p>Loading profile...</p>;

  const fullName = `${firstName} ${lastName}`.trim();
  const initials = getInitials(fullName, email).toUpperCase();
  const bgColor = stringToColor(fullName || email);

  return (
    <div className="space-y-4 max-w-md border rounded-lg p-4 shadow bg-white">
      <h2 className="text-xl font-semibold">⚙️ Profile Settings</h2>
      <p className="text-sm text-gray-500">Role: Parent</p>

      {/* Profile Picture */}
      <div className="flex flex-col items-center space-y-2">
        {photoURL ? (
          <img
            src={photoURL}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border"
          />
        ) : (
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>
        )}
        {editing && (
          <div className="flex gap-2">
            <label className="cursor-pointer px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
              {uploading ? "Uploading..." : "Change Picture"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
            {photoURL && (
              <button
                type="button"
                onClick={handleRemovePicture}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {!editing ? (
        // ---------------- View Mode ----------------
        <div className="space-y-2">
          <p><span className="font-medium">Title:</span> {title || "—"}</p>
          <p><span className="font-medium">Full Name:</span> {fullName || "—"}</p>
          <p><span className="font-medium">Contact:</span> {contact || "—"}</p>
          <p><span className="font-medium">Email:</span> {email || "—"}</p>
          <p><span className="font-medium">Address:</span> {address || "—"}</p>

          {/* Children */}
          {children.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium">👦 Children Registered:</h3>
              <ul className="list-disc ml-5 text-gray-700">
                {children.map((c, i) => (
                  <li key={i}>
                    {c.firstName} {c.lastName} – Grade {c.grade}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-4 py-2 mt-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit Profile
          </button>
        </div>
      ) : (
        // ---------------- Edit Mode ----------------
        <form className="space-y-4">
          <div>
            <label className="block font-medium">Title</label>
            <select
              className="border p-2 w-full rounded"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            >
              <option value="">Select Title</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
            </select>
          </div>

          <div>
            <label className="block font-medium">First Name</label>
            <input
              className="border p-2 w-full rounded"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium">Last Name</label>
            <input
              className="border p-2 w-full rounded"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium">Contact Number</label>
            <input
              className="border p-2 w-full rounded"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium">Email</label>
            <input
              type="email"
              className="border p-2 w-full rounded bg-gray-100 text-gray-600 cursor-not-allowed"
              value={email}
              readOnly
            />
            <p className="text-xs text-gray-500">
              Email is managed by your account and cannot be changed here.
            </p>
          </div>

          <div>
            <label className="block font-medium">Address</label>
            <textarea
              className="border p-2 w-full rounded"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
