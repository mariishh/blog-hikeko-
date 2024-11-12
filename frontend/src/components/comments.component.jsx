import { useContext } from "react";
import { BlogContext } from "../pages/blog.page";
import CommentField from "./comment-field.component";
import axios from "axios";
import CommentCard from "./comment-card.component";

// Component to display a message when there are no comments
const NoDataMessage = ({ message }) => (
    <div className="text-center text-gray-500 mt-4">
        {message}
    </div>
);

// Async function to fetch comments
export const fetchComments = async ({ skip = 0, blog_id, setParentCommentCountFun, comment_array = null }) => {
    let res;

    try {
        const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-blog-comments", { blog_id, skip });
        
        data.forEach(comment => {
            comment.childrenLevel = 0;
        });

        setParentCommentCountFun(prevVal => prevVal + data.length);

        if (comment_array === null) {
            res = { results: data };
        } else {
            res = { results: [...comment_array, ...data] };
        }
    } catch (error) {
        console.error("Error fetching comments:", error);
        res = { results: comment_array || [] };
    }
    
    return res;
};

const CommentsContainer = () => {
    const { blog: { title, comments }, commentsWrapper, setCommentsWrapper } = useContext(BlogContext);
    
    // Fallback to an empty object if comments is undefined or null
    const commentsArr = comments?.results || [];

    const containerClasses = `max-sm:w-full fixed ${commentsWrapper ? "top-0 sm:right-0" : "top-[100%] sm:right-[-100%]"}
        duration-700 max-sm:right-0 sm:top-0 w-[30%] min-w-[350px] h-full z-50 bg-white shadow-2xl p-8 px-16 overflow-y-auto overflow-x-hidden`;

    return (
        <div className={containerClasses}>
            {/* Header and Blog Title */}
            <div className="relative">
                <h1 className="text-xl font-medium">Comments</h1>
                <p className="text-lg mt-2 w-[70%] line-clamp-1 text-dark-grey">{title}</p>

                <button
                    onClick={() => setCommentsWrapper(prevVal => !prevVal)}
                    className="absolute top-0 right-0 flex justify-center items-center w-12 h-12 rounded-full bg-grey"
                >
                    <i className="fi fi-br-cross text-2xl mt-1"></i>
                </button>
            </div>

            <hr className="border-grey my-8 w-[120%] -ml-10" />

            <CommentField action="comment" />

            {commentsArr.length > 0 ? (
                commentsArr.map((comment, i) => (
                    <AnimationWrapper key={i}>
                        <CommentCard index={i} leftVal={comment.childrenLevel * 4} commentData={comment} />
                    </AnimationWrapper>
                ))
            ) : (
                <NoDataMessage message="No Comments" />
            )}
        </div>
    );
};

export default CommentsContainer;
