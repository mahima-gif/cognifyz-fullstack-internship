/**
 * Passport.js Configuration for GitHub OAuth 2.0.
 *
 * OAuth 2.0 State Parameter & CSRF Protection:
 * During the OAuth 2.0 Authorization Code flow, the client redirects the user to GitHub.
 * An attacker could trick a victim into submitting the attacker's authorization code,
 * linking the victim's local session to the attacker's GitHub account (OAuth Login CSRF).
 *
 * By enabling `state: true` in passport-github2, Passport generates a cryptographically
 * random, unguessable state token, stores it in the user's session cookie, and includes it
 * in the authorization request to GitHub.
 * When GitHub redirects back to `/auth/github/callback?code=...&state=...`, Passport compares
 * the returned state parameter against the one stored in the user's session.
 * If they do not match, the callback fails immediately, defeating OAuth CSRF attacks.
 *
 * Token Security:
 * The raw GitHub access token is stored ONLY in the server-side session.
 * It is NEVER transmitted to the client browser or exposed in client responses.
 */

const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL,
  isOAuthConfigured
} = require('./env');

/**
 * Session serialization:
 * Stores sanitized user profile and the access token in the server-side session store.
 */
passport.serializeUser((user, done) => {
  done(null, {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    avatarUrl: user.avatarUrl || user._json?.avatar_url || '',
    accessToken: user.accessToken || null
  });
});

/**
 * Session deserialization:
 * Restores the user object from the serialized session store into req.user.
 */
passport.deserializeUser((serializedUser, done) => {
  done(null, serializedUser);
});

// Conditionally register GitHubStrategy only if valid credentials are provided
if (isOAuthConfigured) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: GITHUB_CALLBACK_URL,
        // Only request 'read:user' as required by Task 7 specification
        scope: ['read:user'],
        // `state: true` instructs Passport to use session-backed state tokens to prevent CSRF attacks
        state: true
      },
      (accessToken, refreshToken, profile, done) => {
        // Extract clean user information from GitHub profile and attach token for server-side API calls
        const user = {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName || profile.username,
          avatarUrl:
            profile.photos && profile.photos[0]
              ? profile.photos[0].value
              : profile._json?.avatar_url || '',
          accessToken
        };
        return done(null, user);
      }
    )
  );
}

module.exports = passport;
