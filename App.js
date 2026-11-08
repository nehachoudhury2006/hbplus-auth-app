import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  useWindowDimensions,
} from "react-native";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { auth } from "./src/services/firebase";

WebBrowser.maybeCompleteAuthSession();

const ALLOWED_DOMAIN = "@hbplus.fit";

const demoUser = {
  displayName: "Demo User",
  email: "demo@example.com",
  photoURL: null,
};

export default function App() {
  const { width } = useWindowDimensions();
  const desktop = width >= 850;

  const [user, setUser] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Dashboard");

  // Google OAuth client IDs
  const [googleRequest, googleResponse, promptGoogleLogin] =
    Google.useAuthRequest({
      androidClientId:
        "903663103329-l4al2f3627m718p2oniv33h4ljhk74ck.apps.googleusercontent.com",

      iosClientId:
        "903663103329-glmrebmpeohojsr5rs2dvfbrs80buclf.apps.googleusercontent.com",

      webClientId:
        "903663103329-979mpds3k6d5ba5svdksech83orcck4o.apps.googleusercontent.com",
    });

  const displayUser = user || (demoMode ? demoUser : null);

  // Firebase authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const email = currentUser.email?.toLowerCase() || "";

      if (
        currentUser.emailVerified &&
        email.endsWith(ALLOWED_DOMAIN)
      ) {
        setUser(currentUser);
        setDemoMode(false);
        setError("");
      } else {
        await signOut(auth);
        setUser(null);
        setError(
          "Access restricted. Please login using your official domain email."
        );
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Complete native Android/iOS Google login
  useEffect(() => {
    const finishNativeGoogleLogin = async () => {
      if (
        Platform.OS === "web" ||
        googleResponse?.type !== "success"
      ) {
        return;
      }

      const idToken =
        googleResponse.authentication?.idToken ||
        googleResponse.params?.id_token;

      if (!idToken) {
        setError(
          "Google did not return an ID token. Please try again."
        );
        setLoading(false);
        return;
      }

      try {
        const credential =
          GoogleAuthProvider.credential(idToken);

        const result = await signInWithCredential(
          auth,
          credential
        );

        const signedInUser = result.user;
        const email =
          signedInUser.email?.toLowerCase() || "";

        if (
          !signedInUser.emailVerified ||
          !email.endsWith(ALLOWED_DOMAIN)
        ) {
          await signOut(auth);
          setUser(null);

          setError(
            "Access restricted. Please login using your official domain email."
          );
        } else {
          setUser(signedInUser);
          setDemoMode(false);
          setActiveTab("Dashboard");
          setError("");
        }
      } catch (err) {
        console.error("Native Google login error:", err);

        setError(
          err.message || "Google login failed. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    finishNativeGoogleLogin();
  }, [googleResponse]);

  // Google login handler
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      if (Platform.OS === "web") {
        const provider = new GoogleAuthProvider();

        provider.setCustomParameters({
          prompt: "select_account",
        });

        const result = await signInWithPopup(
          auth,
          provider
        );

        const signedInUser = result.user;

        const email =
          signedInUser.email?.toLowerCase() || "";

        if (
          !signedInUser.emailVerified ||
          !email.endsWith(ALLOWED_DOMAIN)
        ) {
          await signOut(auth);
          setUser(null);

          setError(
            "Access restricted. Please login using your official domain email."
          );
        } else {
          setUser(signedInUser);
          setDemoMode(false);
          setActiveTab("Dashboard");
          setError("");
        }

        setLoading(false);
      } else {
        if (!googleRequest) {
          throw new Error(
            "Google Sign-In is not ready yet. Please try again in a moment."
          );
        }

        await promptGoogleLogin();
      }
    } catch (err) {
      console.error("Google login error:", err);

      if (err.code === "auth/popup-closed-by-user") {
        setError("Login cancelled. Please try again.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError(
          "This website domain is not authorized in Firebase."
        );
      } else {
        setError(
          err.message || "Login failed. Please try again."
        );
      }

      setLoading(false);
    }
  };

  // Demo dashboard
  const handleDemo = () => {
    setError("");
    setDemoMode(true);
    setActiveTab("Dashboard");
  };

  // Logout
  const handleLogout = async () => {
    if (demoMode) {
      setDemoMode(false);
    } else {
      await signOut(auth);
      setUser(null);
    }

    setActiveTab("Dashboard");
    setError("");
  };

  // Loading screen
  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.logo}>H</Text>

        <ActivityIndicator
          size="large"
          color="#7567F8"
        />

        <Text style={styles.muted}>
          Preparing your workspace...
        </Text>
      </View>
    );
  }
    // Dashboard and Profile
  if (displayUser) {
    const name = displayUser.displayName || "User";

    const initials = name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <View style={styles.app}>
        {desktop && (
          <View style={styles.sidebar}>
            <View style={styles.brandRow}>
              <Text style={styles.logo}>H</Text>

              <View>
                <Text style={styles.brand}>HBPLUS</Text>

                <Text style={styles.brandSub}>
                  WORKSPACE PORTAL
                </Text>
              </View>
            </View>

            <Text style={styles.menuTitle}>
              WORKSPACE
            </Text>

            <Nav
              title="Dashboard"
              active={activeTab === "Dashboard"}
              onPress={() => setActiveTab("Dashboard")}
            />

            <Nav
              title="My Profile"
              active={activeTab === "Profile"}
              onPress={() => setActiveTab("Profile")}
            />

            <View style={styles.sidebarBottom}>
              <Text style={styles.sideUser}>{name}</Text>

              <Text style={styles.sideEmail}>
                {displayUser.email}
              </Text>

              <Pressable
                onPress={handleLogout}
                style={styles.logout}
              >
                <Text style={styles.logoutText}>
                  ↗ Sign out
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.main}>
          <View style={styles.topbar}>
            {!desktop && (
              <Text style={styles.brand}>HBPLUS</Text>
            )}

            <View style={styles.topRight}>
              <Text
                style={
                  demoMode
                    ? styles.demoBadge
                    : styles.activeBadge
                }
              >
                {demoMode ? "DEMO MODE" : "● SIGNED IN"}
              </Text>

              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {initials}
                </Text>
              </View>

              {desktop && (
                <Text style={styles.userName}>
                  {name}
                </Text>
              )}
            </View>
          </View>

          {!desktop && (
            <View style={styles.mobileNav}>
              <Nav
                title="Dashboard"
                active={activeTab === "Dashboard"}
                onPress={() => setActiveTab("Dashboard")}
              />

              <Nav
                title="Profile"
                active={activeTab === "Profile"}
                onPress={() => setActiveTab("Profile")}
              />

              <Pressable onPress={handleLogout}>
                <Text style={styles.mobileLogout}>
                  Logout
                </Text>
              </Pressable>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.content}>
            {demoMode && (
              <View style={styles.demoNotice}>
                <Text style={styles.demoNoticeTitle}>
                  Demo workspace
                </Text>

                <Text style={styles.demoNoticeText}>
                  You are exploring a preview. This is not an
                  authenticated account.
                </Text>
              </View>
            )}

            {activeTab === "Dashboard" ? (
              <>
                <Text style={styles.eyebrow}>
                  WORKSPACE / OVERVIEW
                </Text>

                <Text style={styles.heading}>
                  Welcome back, {name}!
                </Text>

                <Text style={styles.subtitle}>
                  Here's an overview of your HBPLUS workspace.
                </Text>

                <View style={styles.hero}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroLabel}>
                      HBPLUS WORKSPACE
                    </Text>

                    <Text style={styles.heroTitle}>
                      Everything you need, in one place.
                    </Text>

                    <Text style={styles.heroText}>
                      A simple and secure space to access your
                      account and manage your profile.
                    </Text>
                  </View>

                  <Text style={styles.heroLogo}>H</Text>
                </View>

                <Text style={styles.sectionTitle}>
                  Account overview
                </Text>

                <View style={styles.cards}>
                  <Stat
                    title="ACCOUNT STATUS"
                    value={demoMode ? "Demo" : "Active"}
                    detail={
                      demoMode
                        ? "Preview session"
                        : "Authenticated"
                    }
                  />

                  <Stat
                    title="EMAIL DOMAIN"
                    value={
                      demoMode
                        ? "Demo only"
                        : "@hbplus.fit"
                    }
                    detail={
                      demoMode
                        ? "Not verified"
                        : "Official domain"
                    }
                  />

                  <Stat
                    title="SIGN-IN METHOD"
                    value={demoMode ? "Preview" : "Google"}
                    detail="Authentication"
                  />
                </View>

                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>
                    Account details
                  </Text>

                  <View style={styles.identity}>
                    {displayUser.photoURL ? (
                      <Image
                        source={{
                          uri: displayUser.photoURL,
                        }}
                        style={styles.photo}
                      />
                    ) : (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {initials}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>
                        {name}
                      </Text>

                      <Text style={styles.muted}>
                        {displayUser.email}
                      </Text>
                    </View>
                  </View>

                  <Detail
                    label="Authentication"
                    value={
                      demoMode
                        ? "Demo preview"
                        : "Google"
                    }
                  />

                  <Detail
                    label="Access level"
                    value={
                      demoMode
                        ? "Preview only"
                        : "Verified account"
                    }
                  />

                  <Detail
                    label="Workspace"
                    value="HBPLUS"
                  />
                </View>

                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>
                    Quick access
                  </Text>

                  <Pressable
                    style={styles.quick}
                    onPress={() => setActiveTab("Profile")}
                  >
                    <Text style={styles.quickTitle}>
                      ◉ View my profile
                    </Text>

                    <Text style={styles.muted}>
                      Review your account information →
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.quick}
                    onPress={handleLogout}
                  >
                    <Text style={styles.quickTitle}>
                      ↗ Sign out
                    </Text>

                    <Text style={styles.muted}>
                      Securely end your session →
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.eyebrow}>
                  WORKSPACE / ACCOUNT
                </Text>

                <Text style={styles.heading}>
                  My Profile
                </Text>

                <Text style={styles.subtitle}>
                  Your account information and access details.
                </Text>

                <View style={styles.panel}>
                  <View style={styles.profileHeader}>
                    {displayUser.photoURL ? (
                      <Image
                        source={{
                          uri: displayUser.photoURL,
                        }}
                        style={styles.largePhoto}
                      />
                    ) : (
                      <View style={styles.largeAvatar}>
                        <Text style={styles.largeAvatarText}>
                          {initials}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.profileName}>
                      {name}
                    </Text>

                    <Text style={styles.muted}>
                      {displayUser.email}
                    </Text>
                  </View>

                  <Detail
                    label="Full name"
                    value={name}
                  />

                  <Detail
                    label="Email address"
                    value={displayUser.email}
                  />

                  <Detail
                    label="Sign-in method"
                    value={
                      demoMode
                        ? "Demo preview"
                        : "Google"
                    }
                  />

                  <Detail
                    label="Account access"
                    value={
                      demoMode
                        ? "Preview only"
                        : "Verified"
                    }
                  />
                </View>
              </>
            )}

            <Text style={styles.footer}>
              © 2026 HBPLUS. All rights reserved.
            </Text>
          </ScrollView>
        </View>
      </View>
    );
  }

  // Login screen
  return (
    <ScrollView contentContainerStyle={styles.loginScreen}>
      <View style={styles.loginCard}>
        <Text style={styles.loginLogo}>H</Text>

        <Text style={styles.brand}>HBPLUS</Text>

        <Text style={styles.brandSub}>
          WORKSPACE PORTAL
        </Text>

        <Text style={styles.loginHeading}>
          Welcome back.
        </Text>

        <Text style={styles.loginSubtitle}>
          Sign in with your official HBPLUS Google account
          to access your workspace.
        </Text>

        <View style={styles.domainBox}>
          <Text style={styles.domainLabel}>
            AUTHORIZED EMAIL DOMAIN
          </Text>

          <Text style={styles.domainValue}>
            @hbplus.fit
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.googleLogo}>G</Text>

          <Text style={styles.googleLabel}>
            Sign in with Google
          </Text>
        </Pressable>

        <Text style={styles.or}>OR</Text>

        <Pressable
          style={styles.demoButton}
          onPress={handleDemo}
        >
          <Text style={styles.demoButtonText}>
            Explore Demo Dashboard →
          </Text>
        </Pressable>

        <Text style={styles.demoHelper}>
          Preview the interface without signing in.
          Demo access is not an authenticated session.
        </Text>

        <Text style={styles.security}>
          Secure authentication powered by Google and Firebase.
        </Text>

        <Text style={styles.footer}>
          © 2026 HBPLUS. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}

// Navigation component
function Nav({ title, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.nav, active && styles.navActive]}
    >
      <Text
        style={[
          styles.navText,
          active && styles.navTextActive,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

// Dashboard statistics
function Stat({ title, value, detail }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.muted}>{detail}</Text>
    </View>
  );
}

// Account details
function Detail({ label, value }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// Application styles
const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#F5F6FA",
    justifyContent: "center",
    alignItems: "center",
  },

  logo: {
    width: 48,
    height: 48,
    lineHeight: 48,
    textAlign: "center",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#7164E8",
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    marginBottom: 12,
  },

  muted: {
    color: "#9295A8",
    fontSize: 11,
    marginTop: 5,
  },

  app: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F5F6FA",
  },

  sidebar: {
    width: 245,
    backgroundColor: "#191A2D",
    padding: 22,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 55,
  },

  brand: {
    color: "#292B43",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },

  brandSub: {
    color: "#9699AB",
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 3,
  },

  menuTitle: {
    color: "#777B98",
    fontSize: 10,
    marginBottom: 15,
  },

  nav: {
    padding: 13,
    borderRadius: 9,
    marginBottom: 7,
  },

  navActive: {
    backgroundColor: "#343151",
  },

  navText: {
    color: "#A5A7BA",
    fontSize: 12,
    fontWeight: "600",
  },

  navTextActive: {
    color: "#FFFFFF",
  },

  sidebarBottom: {
    marginTop: "auto",
  },

  sideUser: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  sideEmail: {
    color: "#999BB0",
    fontSize: 10,
    marginTop: 5,
  },

  logout: {
    backgroundColor: "#30243A",
    padding: 13,
    borderRadius: 9,
    marginTop: 18,
  },

  logoutText: {
    color: "#FFB7C1",
    fontSize: 12,
    fontWeight: "700",
  },

  main: {
    flex: 1,
    minWidth: 0,
  },

  topbar: {
    height: 68,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E9EAF0",
    paddingHorizontal: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  activeBadge: {
    color: "#159B75",
    fontSize: 9,
    fontWeight: "800",
  },

  demoBadge: {
    color: "#B77A26",
    fontSize: 9,
    fontWeight: "800",
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: "#7164E8",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  userName: {
    color: "#292B40",
    fontWeight: "700",
    fontSize: 12,
  },

  mobileNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 8,
  },

  mobileLogout: {
    color: "#C05B6D",
    fontSize: 11,
    fontWeight: "700",
  },

  content: {
    padding: 27,
    paddingBottom: 45,
    width: "100%",
    maxWidth: 1150,
    alignSelf: "center",
  },

  eyebrow: {
    color: "#8175D7",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  heading: {
    color: "#25273D",
    fontSize: 27,
    fontWeight: "900",
    marginBottom: 6,
  },

  subtitle: {
    color: "#8C8FA1",
    fontSize: 12,
    marginBottom: 24,
  },

  hero: {
    backgroundColor: "#292744",
    borderRadius: 17,
    padding: 25,
    minHeight: 175,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },

  heroLabel: {
    color: "#B9B0FF",
    fontSize: 9,
    fontWeight: "800",
    marginBottom: 12,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    maxWidth: 420,
  },

  heroText: {
    color: "#C3C1D8",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 10,
    maxWidth: 420,
  },

  heroLogo: {
    color: "#FFFFFF",
    backgroundColor: "#7164E8",
    overflow: "hidden",
    borderRadius: 20,
    fontSize: 43,
    fontWeight: "900",
    padding: 18,
    marginLeft: 12,
  },

  sectionTitle: {
    color: "#292B40",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
  },

  cards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 13,
    marginBottom: 22,
  },

  stat: {
    flexGrow: 1,
    flexBasis: 180,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9EAF0",
    borderRadius: 13,
    padding: 17,
  },

  statLabel: {
    color: "#9295A8",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  statValue: {
    color: "#292B40",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 13,
  },

  panel: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9EAF0",
    borderRadius: 14,
    padding: 20,
    marginBottom: 17,
    maxWidth: 800,
  },

  panelTitle: {
    color: "#292B40",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 17,
  },

  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginBottom: 15,
  },

  photo: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  detail: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderTopWidth: 1,
    borderColor: "#F0F0F4",
    gap: 10,
  },

  detailLabel: {
    color: "#9295A8",
    fontSize: 11,
  },

  detailValue: {
    color: "#414359",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
  },

  quick: {
    paddingVertical: 13,
    borderTopWidth: 1,
    borderColor: "#F0F0F4",
  },

  quickTitle: {
    color: "#48436E",
    fontWeight: "800",
    fontSize: 12,
  },

  footer: {
    color: "#A0A3B3",
    fontSize: 9,
    marginTop: 18,
    textAlign: "center",
  },

  demoNotice: {
    backgroundColor: "#FFF7E8",
    borderColor: "#F0D9AA",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 22,
  },

  demoNoticeTitle: {
    color: "#95631D",
    fontWeight: "800",
    fontSize: 12,
  },

  demoNoticeText: {
    color: "#9A7A48",
    fontSize: 10,
    marginTop: 5,
    lineHeight: 16,
  },

  profileHeader: {
    alignItems: "center",
    paddingVertical: 15,
    marginBottom: 15,
  },

  largePhoto: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginBottom: 12,
  },

  largeAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#7164E8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  largeAvatarText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
  },

  profileName: {
    color: "#292B40",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 5,
  },

  loginScreen: {
    flexGrow: 1,
    minHeight: "100%",
    backgroundColor: "#F4F5FA",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  loginCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9EAF0",
  },

  loginLogo: {
    width: 58,
    height: 58,
    lineHeight: 58,
    textAlign: "center",
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "#7164E8",
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 13,
  },

  loginHeading: {
    color: "#25273D",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 28,
  },

  loginSubtitle: {
    color: "#85899D",
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
    marginVertical: 15,
  },

  domainBox: {
    width: "100%",
    backgroundColor: "#F7F6FF",
    padding: 16,
    borderRadius: 11,
    marginBottom: 18,
  },

  domainLabel: {
    color: "#9290AE",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  domainValue: {
    color: "#6559C7",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 7,
  },

  googleButton: {
    width: "100%",
    height: 52,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  googleLogo: {
    color: "#4285F4",
    fontSize: 23,
    fontWeight: "900",
  },

  googleLabel: {
    color: "#3C4043",
    fontSize: 14,
    fontWeight: "600",
  },

  or: {
    color: "#A0A2B1",
    fontSize: 9,
    fontWeight: "800",
    marginVertical: 17,
  },

  demoButton: {
    width: "100%",
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD8FF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  demoButtonText: {
    color: "#665BC1",
    fontSize: 12,
    fontWeight: "800",
  },

  demoHelper: {
    color: "#999CAD",
    fontSize: 9,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 10,
  },

  errorBox: {
    width: "100%",
    backgroundColor: "#FFF0F1",
    borderRadius: 9,
    padding: 12,
    marginBottom: 15,
  },

  errorText: {
    color: "#B44E5B",
    textAlign: "center",
    fontSize: 11,
  },

  security: {
    color: "#999CAD",
    fontSize: 9,
    marginTop: 22,
  },
});