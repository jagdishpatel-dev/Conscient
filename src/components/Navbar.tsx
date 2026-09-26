import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Successfully logged out!");
    navigate("/");
  };

  return (
    <nav className="fixed top-0 w-full bg-cream/80 backdrop-blur-sm z-50 border-b border-beige">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/938964b4-2753-4dca-85b4-a389d246d96c.png" 
              alt="Conscient Logo" 
              className="h-14" 
              loading="eager"
              fetchPriority="high"
            />
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/chat" className="text-brown hover:text-deep-red transition-colors">AI Chat</Link>
            <Link to="/diary" className="text-brown hover:text-deep-red transition-colors">Diary</Link>
            <Link to="/connect" className="text-brown hover:text-deep-red transition-colors">Connect</Link>
            <Link to="/about" className="text-brown hover:text-deep-red transition-colors">About</Link>
            <div className="flex items-center space-x-4">
              {token ? (
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-md bg-deep-red text-white hover:bg-brown transition-colors"
                >
                  Log Out
                </button>
              ) : (
                <Link 
                  to="/auth" 
                  className="px-4 py-2 rounded-md bg-white text-deep-red hover:bg-beige transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
          <button className="md:hidden text-brown">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;