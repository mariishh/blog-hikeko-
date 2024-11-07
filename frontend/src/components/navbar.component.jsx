import { Link, Outlet, useNavigate } from "react-router-dom";
import logo from "../imgs/image.png";
import { useContext, useState } from "react";
import { UserContext } from "../App";
import UserNavigationPanel from "./user-navigation.component";

const Navbar = () => {
    const [searchBoxVisibility, setSearchBoxVisibility] = useState(false);
    const [userNavPanel, setUserNavPanel] = useState(false);
    const [searchQuery, setSearchQuery] = useState(""); // Track search input value

    let navigate = useNavigate();

    const { userAuth } = useContext(UserContext);
    const { access_token, profile_img } = userAuth || {};

    const handleUserNavPanel = () => {
        setUserNavPanel((currentVal) => !currentVal);
    };

    const handleSearch = (e) => {
        let query = e.target.value;
        setSearchQuery(query); // Update the search query state

        if (e.key === "Enter" && query.length) {
            navigate(`/search/${query}`);
            setSearchQuery(""); // Reset search input after navigation
        }
    };

    const handleBlur = () => {
        setTimeout(() => {
            setUserNavPanel(false);
        }, 200);
    };

    return (
        <>
            <nav className="navbar">
                <Link to="/" className="flex-none w-10">
                    <img src={logo} className="w-full" alt="Logo" />
                </Link>

                {/* Search Box */}
                <div
                    className={`absolute bg-white w-full left-0 top-full mt-0.5 border-b border-grey py-4 px-[5vw] md:border-0 md:block md:relative md:inset-0 md:p-0 md:w-auto transition-all duration-300 ease-in-out ${
                        searchBoxVisibility ? "block" : "hidden"
                    }`}
                    style={{ zIndex: 999 }}
                >
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearch} // Update search query as the user types
                        placeholder="Search"
                        className="w-full md:w-auto bg-grey p-4 pl-6 pr-[12%] md:pr-6 rounded-full placeholder:text-dark-grey md:pl-12"
                        onKeyDown={handleSearch}
                    />
                    <i className="fi fi-rr-search absolute right-[10%] md:pointer-events-none md:left-5 top-1/2 -translate-y-1/2 text-xl text-dark-grey"></i>
                </div>

                <div className="flex items-center gap-3 md:gap-6 ml-auto">
                    {/* Mobile search button */}
                    <button
                        className="md:hidden bg-grey w-12 h-12 rounded-full flex items-center justify-center"
                        onClick={() => setSearchBoxVisibility((currentVal) => !currentVal)}
                    >
                        <i className="fi fi-rr-search text-xl"></i>
                    </button>

                    <Link to="/editor" className="hidden md:flex gap-2 link">
                        <i className="fi fi-rr-file-edit"></i>
                        <p>Write</p>
                    </Link>

                    {access_token ? (
                        <>
                            <Link to="/dashboard/notification">
                                <button className="w-12 h-12 rounded-full by-grey relative hover:bg-black/10">
                                    <i className="fi fi-rr-bell text-2xl block mt-1"></i>
                                </button>
                            </Link>

                            <div
                                className="relative"
                                onClick={handleUserNavPanel}
                                onBlur={handleBlur}
                            >
                                <button className="w-12 h-12 mt-1">
                                    <img
                                        src={profile_img || "/default-profile-img.png"} // Fallback image if no profile image
                                        className="w-full h-full object-cover rounded-full"
                                        alt="Profile"
                                    />
                                </button>
                                {userNavPanel ? <UserNavigationPanel /> : ""}
                            </div>
                        </>
                    ) : (
                        <>
                            <Link className="btn-dark py-2" to="/signin">
                                Sign In
                            </Link>
                            <Link className="btn-light py-2 hidden md:block" to="/signup">
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </nav>
            <Outlet />
        </>
    );
};

export default Navbar;
