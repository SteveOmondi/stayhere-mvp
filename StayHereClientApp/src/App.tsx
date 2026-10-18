import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AiChat } from "./components/AiChat";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { ToastHost } from "./components/ui";
import { useApp } from "./context/AppContext";
import { AboutPage } from "./pages/AboutPage";
import { CartPage } from "./pages/CartPage";
import { ContactPage } from "./pages/ContactPage";
import { EnquiryChatPage } from "./pages/EnquiryChatPage";
import { ExplorePage } from "./pages/ExplorePage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { HomePage } from "./pages/HomePage";
import { ListingDetailPage } from "./pages/ListingDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { MyApplicationsPage } from "./pages/MyApplicationsPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { MyPropertiesPage } from "./pages/MyPropertiesPage";
import { RentalFlowPage } from "./pages/RentalFlowPage";
import { ShortStayBookingPage } from "./pages/ShortStayBookingPage";
import { SagePage } from "./pages/SagePage";
import { SignUpPage } from "./pages/SignUpPage";
import { loginUrlWithRedirect } from "./lib/authRedirect";

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
  const location = useLocation();
  return isAuthenticated
    ? <>{children}</>
    : <Navigate to={loginUrlWithRedirect(location.pathname + location.search)} replace />;
}

export default function App() {
  const location = useLocation();

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-brand-dark">
      <Navbar />
      <main className="flex-1">
        {/* mode="wait" previously held the NEXT page's mount hostage until the PREVIOUS page's
         * exit tween reported complete. React 18 StrictMode double-invokes effects in dev, which
         * can desync AnimatePresence's internal exit bookkeeping for exactly this key-remount
         * pattern (a fresh `key` on every route change) - when that happens the exit never
         * resolves, so the new route silently never mounts: the URL changes but the old page
         * stays on screen until a hard refresh. Dropping "wait" removes the dependency entirely -
         * the new page always mounts immediately on navigation, with the old one fading out
         * behind it rather than gating it. */}
        <AnimatePresence initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
            <Route path="/explore" element={<PageWrapper><ExplorePage /></PageWrapper>} />
            <Route path="/listing/:id" element={<PageWrapper><ListingDetailPage /></PageWrapper>} />
            <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
            <Route path="/signup" element={<PageWrapper><SignUpPage /></PageWrapper>} />
            <Route path="/favorites" element={<PageWrapper><FavoritesPage /></PageWrapper>} />
            <Route path="/cart" element={
              <RequireAuth><PageWrapper><CartPage /></PageWrapper></RequireAuth>
            } />
            <Route path="/enquiries/:id" element={
              <RequireAuth><PageWrapper><EnquiryChatPage /></PageWrapper></RequireAuth>
            } />
            <Route path="/about" element={<PageWrapper><AboutPage /></PageWrapper>} />
            <Route path="/contact" element={<PageWrapper><ContactPage /></PageWrapper>} />
            <Route path="/dashboard" element={
              <RequireAuth><PageWrapper><MyPropertiesPage /></PageWrapper></RequireAuth>
            } />
            <Route path="/bookings" element={
              <RequireAuth><PageWrapper><MyBookingsPage /></PageWrapper></RequireAuth>
            } />
            <Route path="/rental-flow" element={
              <RequireAuth><PageWrapper><RentalFlowPage /></PageWrapper></RequireAuth>
            } />
            <Route path="/book-stay" element={
              <RequireAuth><PageWrapper><ShortStayBookingPage /></PageWrapper></RequireAuth>
            } />
            <Route path="/my-applications" element={
              <RequireAuth><PageWrapper><MyApplicationsPage /></PageWrapper></RequireAuth>
            } />
            <Route path="/sage" element={
              <RequireAuth><SagePage /></RequireAuth>
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
