import { Link } from "react-router-dom";

const UserCard = ({ users }) => {
    // Check if `users` is an array and has items before mapping over it
    if (!Array.isArray(users) || users.length === 0) {
        return <div>No users found</div>; // Fallback message when no users are provided
    }

    return (
        <div>
            {users.map((user, index) => {
                const { personal_info: { fullname, username, profile_img } } = user;

                return (
                    <Link key={index} to={`/user/${username}`} className="flex gap-5 items-center mb-5">
                        <img src={profile_img} className="w-14 h-14 rounded-full" alt={`${username}'s profile`} />
                        
                        <div>
                            <h1 className="font-medium text-xl line-clamp-2">{fullname}</h1>
                            <p className="text-dark-grey">@{username}</p>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
};

export default UserCard;
