# Email Microservice

A professional Node.js email microservice designed for high flexibility and performance. It handles transactional emails and bulk announcements with ease, offering dynamic template management, rate-limiting, and deep customizability.

## 🚀 Key Features

- **Professional UI**: Transactional emails (like Password Reset) feature a sleek, modern, and professional design.
- **Dynamic Table Mapping**: Pass custom table names in any request to target different user or template databases on the fly.
- **Batched Bulk Sending**: Advanced rate-limiting using the Token Bucket algorithm to safely send thousands of emails without SMTP bans.
- **Automated Personalization**: Automatically injects user data (name, email) into templates from the database.
- **Dynamic Expiration**: Specify link expiration times (e.g., "15 minutes", "2 hours") directly in the API call.
- **Placeholder Engine**: Automatic extraction and strict validation of `{{tokens}}` during template creation and email sending.

---

## 📂 Project Structure

```text
emm/
├── src/
│   ├── app.js                          # Main entry point (Express)
│   ├── routes/index.js                 # API route definitions
│   ├── controllers/
│   │   ├── emailController.js          # Logic for email sending endpoints
│   │   └── templateController.js       # Logic for template CRUD operations
│   ├── services/
│   │   ├── emailService.js             # Core logic for sending and batching
│   │   └── templateService.js          # Core logic for database template operations
│   ├── config/
│   │   ├── db.js                       # MySQL connection pool
│   │   └── mailer.js                   # Nodemailer transporter setup
│   └── utils/
│       ├── placeholder.js              # Token extraction and substitution logic
│       └── rateLimiter.js              # Batching and delay management
├── schema.sql                          # MySQL database initialization script
├── package.json                        # NPM configuration and dependencies
└── .env                                # Configuration (Port, DB, SMTP)
```

---

## 🛰️ API Reference

### 1. Template Management

#### **Create Template**
Allows you to store an HTML email template. Placeholders like `{{name}}` are auto-detected.

- **Endpoint**: `POST /api/templates`
- **Request Body**:
```json
{
  "key": "welcome_email",
  "subject": "Welcome to our platform, {{name}}!",
  "html_body": "<h1>Hello {{name}}!</h1><p>We're glad to have you.</p>",
  "target_table": "email_templates" // Optional: defaults to email_templates
}
```

#### **Get Template**
Retrieve a specific template and its required placeholders.

- **Endpoint**: `GET /api/templates/:key?target_table=email_templates`
- **Query Params**:
  - `target_table`: (Optional) The database table to query.

---

### 2. Email Operations

#### **Send Reset Password**
Sends a professionally designed password reset email with a security header image.

- **Endpoint**: `POST /api/email/reset-password`
- **Request Body**:
```json
{
  "email": "user@example.com",
  "reset_link": "https://myapp.com/reset?token=123",
  "expires_in": "45 minutes" // Optional: Customizable expiration text
}
```

#### **Send Bulk Announcement**
Perform a mass mailing to users filtered by their `role`.

- **Endpoint**: `POST /api/email/announcement`
- **Request Body**:
```json
{
  "template_key": "promo_july",
  "role": "subscriber",
  "target_table": "users",           // Optional: Dynamic user database
  "template_table": "email_templates", // Optional: Dynamic template database
  "placeholders": {
    "promo_code": "HOTSUMMER",
    "cta_url": "https://myapp.com/sale"
  }
}
```

---

## 🛠️ Setup & Deployment

1. **Initialize Database**
   Import `schema.sql` into your MySQL server.
   ```sql
   source schema.sql;
   ```

2. **Configure Environment**
   Rename `.env.local` to `.env` and fill in:
   - `DB_PASSWORD`: Your MySQL password.
   - `GMAIL_APP_PASSWORD`: Your 16-character [Google App Password](https://myaccount.google.com/apppasswords).

3. **Install & Start**
   ```bash
   npm install
   npm run dev
   ```

---

## 🧪 Testing Playground

**1. Create a User**
```sql
INSERT INTO users (name, email, role) VALUES ('Test User', 'your-email@example.com', 'subscriber');
```

**2. Create a Template via API**
`POST /api/templates`
```json
{
  "key": "test_mail",
  "subject": "Hello {{name}}",
  "html_body": "<p>This is a test. Your code is {{code}}.</p>"
}
```

**3. Fire Announcement API**
`POST /api/email/announcement`
```json
{
  "template_key": "test_mail",
  "role": "subscriber",
  "placeholders": { "code": "ABC-123" }
}
```