import { Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar.component";
import UserAuthForm from "./pages/userAuthForm.page";
import { createContext, useEffect, useState } from "react";
import { lookInSession } from "./common/session";
import Editor from "./pages/editor.pages";
import HomePage from "./pages/home.page";
import SearchPage from "./pages/search.page";
import PageNotFound from "./pages/404.page";
import ProfilePage from "./pages/profile.page";

// Context to manage user state
export const UserContext = createContext({});

const App = () => {
  const [userAuth, setUserAuth] = useState({ isAuthenticated: false, access_token: null });

  useEffect(() => {
    const userInSession = lookInSession("user");

    try {
      if (userInSession) {
        const parsedUser = JSON.parse(userInSession);
        setUserAuth({ ...parsedUser, isAuthenticated: true });
      } else {
        setUserAuth({ isAuthenticated: false, access_token: null });
      }
    } catch (error) {
      console.error("Error parsing user session:", error);
      setUserAuth({ isAuthenticated: false, access_token: null }); // Set default on error
    }
  }, []);

  return (
    <UserContext.Provider value={{ userAuth, setUserAuth }}>
      <Routes>
        <Route path="/editor" element={<Editor />} />
        <Route path="/" element={<Navbar />}>
          <Route index element={<HomePage />} />
          <Route path="signin" element={<UserAuthForm type="sign-in" />} />
          <Route path="signup" element={<UserAuthForm type="sign-up" />} />
          <Route path="search/:query" element={<SearchPage />} />
          <Route path="user/:id" element={<ProfilePage />} /> {/* Profile route */}
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </UserContext.Provider>
  );
};

export default App;
