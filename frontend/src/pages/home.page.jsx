import axios from "axios";
import AnimationWrapper from "../common/page-animation";
import InPageNavigation from "../components/inpage-navigation.component";
import { useEffect, useState } from "react";
import Loader from "../components/loader.component";
import BlogPostCard from "../components/blog-post.component";
import MinimalBlogsPost from "../components/nobanner-blog-post.component";
import { activeTabRef } from "../components/inpage-navigation.component";
import NoDataMessage from "../components/nodata.component";
import { filterPaginationData } from "../common/filter-pagination-data";
import LoadMoreDataBtn from "../components/load-more.component";

const HomePage = () => {
    let [blogs, setBlog] = useState(null);
    let [trendingBlogs, setTrendingBlog] = useState(null);
    let [pageState, setPageState] = useState("home");
    let [page, setPage] = useState(1);  // Track the page state

    let categories = [
        "Popular Mountains for Day", 
        "Mountain of the Month", 
        "Nature & Wildlife", 
        "Beginner Friendly", 
        "Challenging", 
        "Seasonal Day Hikes"
    ];

    const fetchLatestBlogs = (page) => {
        axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs", { params: { page } })
            .then(async ({ data }) => {
                let formatedData = await filterPaginationData({
                    state: blogs,
                    data: data.blogs,
                    page,
                    countRoute: "/all-latest-blogs-count"
                });
                setBlog(formatedData);
            })
            .catch(err => {
                console.error(err);
            });
    };

    const fetchBlogsByCategory = (page) => {
        axios
            .post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", { tag: pageState, page })
            .then(async ({ data }) => {
                let formatedData = await filterPaginationData({
                    state: blogs,
                    data: data.blogs,
                    page,
                    countRoute: "/search-blogs-count",
                    data_to_send: { tag: pageState }
                });
                setBlog(formatedData);
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const fetchTrendingBlogs = () => {
        axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/trending-blogs")
            .then(({ data }) => {
                setTrendingBlog(data.blogs);
            })
            .catch(err => {
                console.error(err);
            });
    };

    const loadBlogByCategory = (e) => {
        let category = e.target.innerText.toLowerCase();
        setBlog(null);

        if (pageState === category) {
            setPageState("home");
            setPage(1); // Reset page when switching to home
            return;
        }

        setPageState(category);
        setPage(1); // Reset page when switching categories
    };

    useEffect(() => {
        activeTabRef.current.click();
        if (pageState === "home") {
            fetchLatestBlogs(page);
        } else {
            fetchBlogsByCategory(page);
        }
        if (!trendingBlogs) {
            fetchTrendingBlogs();
        }
    }, [pageState, page]);  // Trigger when either pageState or page changes

    return (
        <AnimationWrapper>
            <section className="h-cover flex justify-center gap-10">
                <div className="w-full">
                    <InPageNavigation routes={[pageState, "trending blogs"]} defaultHidden={["trending blogs"]}>
                        <>
                            {blogs == null ? (
                                <Loader />
                            ) : (
                                blogs.results.length ? (
                                    blogs.results.map((blog, i) => (
                                        <AnimationWrapper
                                            transition={{
                                                duration: 1,
                                                delay: i * 0.1,
                                            }}
                                            key={i}
                                        >
                                            <BlogPostCard
                                                content={blog}
                                                author={blog.author.personal_info}
                                            />
                                        </AnimationWrapper>
                                    ))
                                ) : (
                                    <NoDataMessage message="No blogs published" />
                                )
                            )}
                            <LoadMoreDataBtn state={blogs} fetchDataFun={(pageState == "home" ? fetchLatestBlogs : fetchBlogsByCategory)} />
                        </>
                        <div>
                            {trendingBlogs == null ? (
                                <Loader />
                            ) : (
                                trendingBlogs.length ? (
                                    trendingBlogs.map((blog, i) => (
                                        <AnimationWrapper
                                            transition={{
                                                duration: 1,
                                                delay: i * 0.1,
                                            }}
                                            key={i}
                                        >
                                            <MinimalBlogsPost blog={blog} index={i} />
                                        </AnimationWrapper>
                                    ))
                                ) : (
                                    <NoDataMessage message="No trending blogs available" />
                                )
                            )}
                        </div>
                    </InPageNavigation>
                </div>
                <div className="min-w-[40%] lg:min-w-[400px] max-w-min border-1 border-grey pl-8 pt-3 max-md:hidden">
                    <div className="flex flex-col gap-10">
                        <div>
                            <h1 className="font-medium text-xl mb-8">Stories from all interests</h1>
                            <div className="flex gap-3 flex-wrap">
                                {categories.map((category, i) => (
                                    <button
                                        onClick={loadBlogByCategory}
                                        className={`tag ${pageState === category ? "bg-black text-white" : ""}`}
                                        key={i}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h1 className="font-medium text-xl mb-8">Trending 
                                <i className="fi fi-rr-arrow-trend-up"></i>
                            </h1>
                            {trendingBlogs == null ? <Loader /> : (
                                trendingBlogs.length ? (
                                    trendingBlogs.map((blog, i) => (
                                        <AnimationWrapper transition={{ duration: 1, delay: i * 0.1 }} key={i}>
                                            <MinimalBlogsPost blog={blog} index={i} />
                                        </AnimationWrapper>
                                    ))
                                ) : (
                                    <NoDataMessage message="No trending blogs available" />
                                )
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </AnimationWrapper>
    );
};

export default HomePage;
