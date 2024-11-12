import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import { getDay } from "../common/date";
import BlogInteraction from "../components/blog-interaction.component";
import BlogPostCard from "../components/blog-post.component";
import BlogContent from "../components/blog-content.component";
import CommentsContainer, { fetchComments } from "../components/comments.component";

// Default blog structure
export const blogStructure = {
    title: '',
    des: '',
    content: [{ blocks: [] }],
    tags: [],
    author: { personal_info: {} },
    banner: '',
    publishedAt: ''
};

export const BlogContext = createContext({});

const BlogPage = () => {
    const { blog_id } = useParams();

    const [blog, setBlog] = useState(blogStructure);
    const [similarBlogs, setSimilarBlogs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLikedByUser, setLikedByUser] = useState(false);
    const [commentsWrapper, setCommentsWrapper] = useState(false);
    const [totalParentCommentsLoaded, setTotalParentCommentsLoaded] = useState(0);

    const { title, content, banner, author: { personal_info: { fullname = '', username: author_username = '', profile_img = '' } = {} }, publishedAt } = blog;

    const fetchBlog = () => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-blog", { blog_id })
            .then(async ({ data: { blog } }) => {
                blog.comments = await fetchComments({ blog_id: blog._id, setParentCommentCountFun: setTotalParentCommentsLoaded });

                if (blog && blog.content) {
                    setBlog(blog);
                    // Fetch similar blogs based on the first tag
                    axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", { tag: blog.tags[0], limit: 6, eliminate_blog: blog_id })
                        .then(({ data }) => {
                            setSimilarBlogs(data.blogs);
                        })
                        .catch(err => {
                            console.error("Error fetching similar blogs:", err);
                            setSimilarBlogs([]); // Handle error case
                        });
                    setLoading(false);
                } else {
                    setLoading(false);
                    console.log("Blog content is missing or invalid.");
                }
            })
            .catch(err => {
                console.error("Error fetching blog:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        resetStates();
        fetchBlog();
    }, [blog_id]);

    const resetStates = () => {
        setBlog(blogStructure);
        setSimilarBlogs(null);
        setLoading(true);
        setLikedByUser(false);
        setCommentsWrapper(false);
        setTotalParentCommentsLoaded(0);
    };

    return (
        <AnimationWrapper>
            {loading ? <Loader /> :
                <BlogContext.Provider value={{ blog, setBlog, isLikedByUser, setLikedByUser, commentsWrapper, setCommentsWrapper, totalParentCommentsLoaded, setTotalParentCommentsLoaded }}>
                    <CommentsContainer />
                    <div className="max-w-[900px] center py-10 max-lg:px-[5vw]">
                        <img src={banner} className="aspect-video" alt={`${title} banner`} />
                        <div className="m-12">
                            <h2>{title}</h2>
                            <div className="flex max-sm:flex-col justify-between my-8">
                                <div className="flex gap-5 items-start">
                                    <img src={profile_img} className="w-12 h-12 rounded-full" alt={`${fullname}'s profile`} />
                                    <p className="capitalize">
                                        {fullname}
                                        <br />
                                        @
                                        <Link to={`/user/${author_username}`} className="underline">{author_username}</Link>
                                    </p>
                                </div>
                                <p className="text-dark opacity-75 max-sm:mt-6 max-sm:ml-12 max-sm:pl-5">Published on {getDay(publishedAt)}</p>
                            </div>
                        </div>
                        <BlogInteraction />
                        <div className="my-12 font-gelasio blog-page-content">
                            {
                                content.length > 0 && content[0].blocks ? (
                                    content[0].blocks.map((block, i) => (
                                        <div key={i} className="my-4 md:my-8">
                                            <BlogContent block={block} />
                                        </div>
                                    ))
                                ) : (
                                    <p>No content available.</p>
                                )
                            }
                        </div>
                        <BlogInteraction />
                        {
                            similarBlogs != null && similarBlogs.length ? (
                                <>
                                    <h1 className="text-2xl mt-14 mb-10 font-medium">Similar blogs</h1>
                                    {
                                        similarBlogs.map((blog, i) => {
                                            const { author: { personal_info } } = blog;
                                            return (
                                                <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.08 }}>
                                                    <BlogPostCard content={blog} author={personal_info} />
                                                </AnimationWrapper>
                                            );
                                        })
                                    }
                                </>
                            ) : <p className="text-gray-500 mt-10">No similar blogs available.</p>
                        }
                        <BlogInteraction />
                    </div>
                </BlogContext.Provider>
            }
        </AnimationWrapper>
    );
};

export default BlogPage;
