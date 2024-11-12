import { useContext, useEffect } from "react";
import { BlogContext } from "../pages/blog.page";
import { Link } from "react-router-dom";
import { UserContext } from "../App";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";

const BlogInteraction = () => {
    let { 
        blog: { 
            title, 
            blog_id, 
            activity = {}, 
            author: { personal_info: { username: author_username } = {} } 
        }, 
        setBlog, 
        isLikedByUser, 
        setLikedByUser,
        setCommentsWrapper
    } = useContext(BlogContext);

    let { userAuth: { username, access_token } = {} } = useContext(UserContext);

    useEffect(() => {
        if (access_token) {
          // make request to server to get like information
          axios.post(
            `${import.meta.env.VITE_SERVER_DOMAIN}/isliked-by-user`,
            { _id: blog_id },  // Use blog_id here
            {
              headers: {
                Authorization: `Bearer ${access_token}`,
              },
            }
          )
            .then(({ data: { result } }) => {
                setLikedByUser(Boolean(result));  // Corrected typo (Boolen -> Boolean)
            })
            .catch((err) => {
              console.log(err);
            });
        }
    }, [access_token, blog_id, setLikedByUser]);

    const handleLike = () => {
        if (access_token) {
            // Toggle the like status
            const newLikeStatus = !isLikedByUser;
    
            // Update the liked state immediately
            setLikedByUser(newLikeStatus);
    
            // Update the total likes in the blog state
            setBlog(prevBlog => ({
                ...prevBlog,
                activity: {
                    ...prevBlog.activity,
                    total_likes: newLikeStatus 
                        ? prevBlog.activity.total_likes + 1 
                        : prevBlog.activity.total_likes - 1
                }
            }));
    
            // Send the like status to the server
            axios.post(
                `${import.meta.env.VITE_SERVER_DOMAIN}/like-blog`, 
                { _id: blog_id, isLikedByUser: newLikeStatus },  // Use blog_id here
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`
                    }
                }
            )
            .then(({ data }) => {
                console.log("Like status updated:", data);
            })
            .catch(err => {
                console.error("Error liking the blog:", err);
                toast.error("Unable to like this blog. Please try again.");
            });
    
        } else {
            toast.error("Please login to like this blog");
        }
    };

    return (
        <>
            <Toaster />
            <hr className="border-grey my-2" />
            <div className="flex gap-6 justify-between">
                <div className="flex gap-3 items-center">
                    <button 
                        onClick={handleLike}
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${isLikedByUser ? "bg-red/20 text-red" : "bg-grey/80"}`}>
                        <i className={"fi " + (isLikedByUser ? "fi-sr-heart" : "fi fi-rr-heart")}></i>
                    </button>
                    <p className="text-xl text-dark-grey">{activity.total_likes}</p>
                    
                    <button 
                        onClick={() => setCommentsWrapper(preVal => !preVal)}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-grey/80">
                        <i className="fi fi-rr-comment-dots"></i>
                    </button>
                    <p className="text-xl text-dark-grey">{activity.total_comments}</p>
                </div>
                <div className="flex gap-6 items-center">
                    {username === author_username ? (
                        <Link to={`/editor/${blog_id}`} className="underline hover:text-purple">Edit</Link>
                    ) : " "}
                    <Link to={`https://twitter.com/intent/tweet?text=Read ${title}`}>
                        <i className="fi fi-brands-twitter text-xl hover:text-twitter"></i>
                    </Link>
                </div>
            </div>
            <hr className="border-grey my-2" />
        </>
    );
};

export default BlogInteraction;
