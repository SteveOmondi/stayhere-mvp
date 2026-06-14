import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AiChat } from "./components/AiChat";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { ToastHost } from "./components/ui";
import { useApp } from "./context/AppContext";
import { AboutPage } from "./pages/AboutPage";
import { CartPage } from "./pages/CartPage";
import { ContactPage } from "./pages/ContactPage";
import { ExplorePage } from "./pages/ExplorePage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { HomePage } from "./pages/HomePage";
import { ListingDetailPage } from "./pages/ListingDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { MyApplicationsPage } from "./pages/MyApplicationsPage";
import { MyPropertiesPage } from "./pages/MyPropertiesPage";
import { RentalFlowPage } from "./pages/RentalFlowPage";
import { SignUpPage } from "./pages/SignUpPage";

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-brand-dark">
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
            <Route path="/explore" element={<PageWrapper><ExplorePage /></PageWrapper>} />
            <Route path="/listing/:id" element={<PageWrapper><ListingDetailPage /></PageWrapper>} />
            <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
            <Route path="/signup" element={<PageWrapper><SignUpPage /></PageWrapper>} />
            <Route path="/favorites" element={<PageWrapper><FavoritesPage /></PageWrapper>} />
            <Route path="/cart" element={<PageWrapper><CartPage /></PageWrapper>} />
            <Route path="/about" element={<PageWrapper><AboutPage /></PageWrapper>} />
            <Route path="/contact" element={<PageWrapper><ContactPage /></PageWrapper>} />
            <Route path="/dashboard" element={
              <RequireAuth><PageWrapper><MyPropertiesPage /></PageWrapper></RequireAuth>
            } />
            <Route path="/rental-flow" element={
              <RequireAuth><PageWrapper><RentalFlowPage /></PageWrapper></RequireAuth>
            } />
            <Route path="/my-applications" element={
              <RequireAuth><PageWrapper><MyApplicationsPage /></PageWrapper></RequireAuth>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
      <AiChat />
      <ToastHost />
    </div>
  );
}
