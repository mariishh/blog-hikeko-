import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';

const ProfilePage = () => {
  const { id } = useParams(); // Access the dynamic 'id' parameter
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Fetch user profile by 'id'
    const fetchUserProfile = async () => {
      try {
        const response = await axios.post('/get-profile', { username: id });
        setUser(response.data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchUserProfile();
  }, [id]); // Re-run the effect if the 'id' changes

  if (!user) return <div>Loading...</div>; // Show loading while user is being fetched

  return (
    <div>
      <h1>User Profile</h1>
      <div className="profile-container">
        <img src={user.personal_info.profile_img} alt={user.personal_info.username} className="profile-img" />
        <h2>{user.personal_info.fullname}</h2>
        <p>@{user.personal_info.username}</p>
        <p>{user.personal_info.bio || "This user has no bio."}</p>
        {/* You can display additional user information here */}
      </div>
    </div>
  );
};

export default ProfilePage;
