import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { storage } from '../storage';
import type { OAuthUser } from '@shared/schema';

// Configure Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists by provider ID
      let user = await storage.getUserByProviderId('google', profile.id);
      
      if (!user) {
        // Check if user exists by email
        const existingUser = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
        
        if (existingUser) {
          // Link OAuth to existing account
          user = await storage.linkOAuthProvider(existingUser.id, {
            provider: 'google',
            providerId: profile.id,
            profilePicture: profile.photos?.[0]?.value
          });
        } else {
          // Create new user
          const oauthUserData: OAuthUser = {
            email: profile.emails?.[0]?.value || '',
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profilePicture: profile.photos?.[0]?.value,
            provider: 'google',
            providerId: profile.id
          };
          
          user = await storage.createOAuthUser(oauthUserData);
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));
}

// Configure Facebook OAuth
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name', 'picture.type(large)']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await storage.getUserByProviderId('facebook', profile.id);
      
      if (!user) {
        const existingUser = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
        
        if (existingUser) {
          user = await storage.linkOAuthProvider(existingUser.id, {
            provider: 'facebook',
            providerId: profile.id,
            profilePicture: profile.photos?.[0]?.value
          });
        } else {
          const oauthUserData: OAuthUser = {
            email: profile.emails?.[0]?.value || '',
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profilePicture: profile.photos?.[0]?.value,
            provider: 'facebook',
            providerId: profile.id
          };
          
          user = await storage.createOAuthUser(oauthUserData);
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
