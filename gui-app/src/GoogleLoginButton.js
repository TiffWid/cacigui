import { supabase } from "./supabase";

const GoogleLoginButton = () => {
  console.log("Google Login Button Component Loaded!");

  const handleGoogleLogin = async () => {
    console.log("Attempting Google Login...");

    const redirectTo = window.location.origin;  // Dynamically get the URL

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
    });

    if (error) {
        console.error("Google Sign-in Error:", error.message);
    } else {
        console.log("Redirecting to Google Login...", data);
    }
};


return (
    <div className="google-login-container">
      <button className="google-login-button" onClick={handleGoogleLogin}>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/200px-Google_%22G%22_Logo.svg.png"
          alt="Google Logo"
          className="google-logo"
          onError={(e) => (e.target.style.display = "none")} // Hide if image fails to load
        />
        Sign in with Google
      </button>
    </div>
  );
};

export default GoogleLoginButton;
