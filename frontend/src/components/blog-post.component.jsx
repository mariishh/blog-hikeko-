import { Link } from "react-router-dom";
import { getDay } from "../common/date";

const BlogPostCard = ({ content, author }) => {
    const { publishedAt, tags = [], title, des, banner, activity: { total_likes }, blog_id: id } = content;
    const { fullname, profile_img, username } = author;

    return (
        <Link to={`/blog/${id}`} className="flex gap-8 items-center border-b border-grey pb-5 mb-4"> 
            <div className="w-full">
                <div className="flex gap-2 items-center mb-7">
                    <img src={profile_img} className="w-6 h-6 rounded-full" alt={`${fullname}'s profile`} />
                    <p className="line-clamp-1">{fullname} @{username}</p>
                    <p className="min-w-fit"> {getDay(publishedAt)}</p>
                </div>

                <h1 className="blog-title">{title}</h1>

                <p className="my-3 text-xl font-gelasio leading-7 max-sm:hidden mc:max-[1100px]:hidden line-2">
                    {des}
                </p>

                <div className="flex gap-4 mt-7">
                    {/* Fallback to an empty string if tags is empty or undefined */}
                    <span className="btn-light py-1 px-4">{tags.length > 0 ? tags[0] : "No tags"}</span>
                    <span className="ml-3 flex items-center gap-2 text-dark-grey">
                        <i className="fi fi-rr-heart text-xl"></i>
                        {total_likes}s
                    </span>
                </div>
            </div>
            <div className="h-28 aspect-square bg-grey">
                <img src={banner} className="w-full h-full aspect-square object-cover" />
            </div>
        </Link>
    );
};

export default BlogPostCard;
