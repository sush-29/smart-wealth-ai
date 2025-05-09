import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Header from "./Header";

export default function ProfileSettings() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUserAndSettings() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error("User not authenticated");
        }
        setUser(user);
        setEmail(user.email || "");
        console.log("Authenticated user ID:", user.id);

        const { data, error } = await supabase
          .from("profilesettings") // Use the new profiles table
          .select("full_name, avatar_url, notification_email")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Fetch settings error:", error);
          throw new Error("Failed to fetch user settings");
        }

        if (data) {
          setFullName(data.full_name || "");
          setAvatarUrl(data.avatar_url || "");
          setNotificationEmail(data.notification_email || user.email || "");
        } else {
          setNotificationEmail(user.email || "");
        }
      } catch (err) {
        setError(err.message);
        console.error("Error fetching user/settings:", err);
      }
    }

    fetchUserAndSettings();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB");
        return;
      }
      setAvatar(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  async function handleSaveChanges() {
    setError("");
    setSuccess("");

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      console.log("Saving changes for user_id:", user.id);

      let finalAvatarUrl = avatarUrl;

      if (avatar) {
        const fileExt = avatar.name.split(".").pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        console.log("Uploading avatar:", fileName);

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatar, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          throw new Error(`Failed to upload avatar: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        finalAvatarUrl = urlData.publicUrl;
        console.log("Avatar URL:", finalAvatarUrl);
      }

      const updates = {
        user_id: user.id,
        full_name: fullName || null,
        avatar_url: finalAvatarUrl || null,
        notification_email: notificationEmail || null,
      };

      const { error } = await supabase
        .from('profilesettings') // Use the new profiles table
        .upsert(updates, {
          onConflict: ['user_id'], // Conflict resolution based on user_id
        });

      if (error) {
        console.error("Settings error:", error);
        throw new Error(`Failed to save settings: ${error.message}`);
      }

      setSuccess("Profile settings updated successfully!");
      setAvatar(null);
    } catch (err) {
      setError(err.message);
      console.error("Error in handleSaveChanges:", err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-8 text-gray-800">Profile Settings</h2>
          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-100 text-green-700 rounded-lg mb-6">
              {success}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm text-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Email is managed by your account settings.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Email
                </label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter notification email"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Email for receiving budget alerts.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Picture
                </label>
                <div className="flex items-center space-x-4">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                      <span className="text-gray-500 text-sm">No Image</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Upload a JPG or PNG (max 5MB).
                </p>
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSaveChanges}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}