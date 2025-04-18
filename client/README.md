# Opzon's Printing Press ERP - Client Application

This is the front-end React application for Opzon's Printing Press Enterprise Resource Planning (ERP) system.

## Features

- User authentication with email and SMS verification
- Dashboard with key business metrics
- Client and order management
- Inventory tracking
- Employee management and payroll
- Supplier management
- Reporting tools

## Authentication Setup

The application uses Supabase for authentication with the following features:

- Email/password authentication
- Email verification with verification codes
- SMS verification (requires Twilio integration)
- Password reset functionality
- Session management

### Setting Up Supabase Authentication

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Enable Email Authentication:
   - Go to Authentication → Providers
   - Enable Email provider
   - Configure email templates for confirmations and password resets

3. Configure Email and SMS Verification:
   - Deploy Edge Functions for email and SMS delivery (see `/server/supabase/README.md`)
   - Configure environment variables in Supabase project settings
   - Create the `verification_codes` table in your database with:
     ```sql
     CREATE TABLE verification_codes (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       email VARCHAR,
       phone VARCHAR,
       code VARCHAR NOT NULL,
       type VARCHAR NOT NULL,
       used BOOLEAN DEFAULT FALSE,
       created_at TIMESTAMP DEFAULT NOW(),
       expires_at TIMESTAMP NOT NULL
     );
     
     CREATE INDEX idx_email_verification ON verification_codes(email, code) WHERE type = 'email';
     CREATE INDEX idx_phone_verification ON verification_codes(phone, code) WHERE type = 'phone';
     ```

## Environment Variables

Create a `.env` file in the client directory with the following variables:

```
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## Deployment

1. Build the production version:
   ```
   npm run build
   ```

2. Deploy to your hosting platform of choice (Netlify, Vercel, Firebase, etc.)

## Learn More

- [Supabase Authentication Documentation](https://supabase.com/docs/guides/auth)
- [React Documentation](https://reactjs.org/)
- [Material UI Documentation](https://mui.com/)