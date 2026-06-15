# Ulap Corner (formerly Cyber Vape)

Ulap Corner is a comprehensive e-commerce and point-of-sale administration system.

---

## 🚀 How to Run the Server

If you ever encounter a "Server Offline" message in the Admin Dashboard or Storefront, it means the Node.js backend server is not running.

Follow these steps to start the server:

1. **Open your Terminal / Command Prompt** in the `cyber-vape-main` directory.
2. **Run the Server Command:**
   ```bash
   node server/index.js
   ```
3. **Verify it is running:**
   You should see the following output in your terminal indicating the server has successfully started:
   ```text
   [Ulap Corner] Connecting to SQLite database...
   🚀 ===================================================
   [Ulap Corner] Server running at http://localhost:8000
   [Ulap Corner] Storefront available at http://localhost:8000/store/shop.html
   [Ulap Corner] Administrative Core successfully bound.
   =======================================================
   ```
4. **Keep the terminal open!** Closing the terminal window will shut down the server.

---

## 🔐 OTP Email Verification Flow

Ulap Corner uses a **6-digit One-Time Password (OTP)** sent to the user's Gmail to verify new customer accounts.

### How It Works

```
Register → OTP sent to Gmail → User enters code on /store/verify-otp.html → Account activated → Login
```

1. Customer fills out the registration form at `/store/register.html`
2. A **6-digit OTP** is generated and emailed instantly to their Gmail
3. They are redirected to `/store/verify-otp.html` where they enter the code
4. The OTP is valid for **15 minutes** — they can request a new code after 60 seconds
5. Once verified, they are redirected to `/store/login.html` with a ✅ success banner
6. If they try to log in before verifying, a **"Verify your account now →"** link is shown

### Watching Email Delivery in the Console

When an OTP is sent, you will see this in the server terminal:

```
🔐 [OTP-DEBUG] OTP for user@gmail.com: 483921 (expires at 2026-06-14T14:00:00.000Z)
✉️  [OTP-EMAIL] Sent to user@gmail.com — Message ID: <abc123@smtp.gmail.com>
```

If the email fails to send, you will see:

```
❌ [OTP-EMAIL] Failed to send OTP email: Invalid login: 535 BadCredentials
```

---

## 📧 SMTP Email Setup (Gmail)

The OTP emails are sent via **Gmail SMTP**. The credentials are stored in `server/.env`.

### Current Configuration (`server/.env`)

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=ulapcorner@gmail.com
SMTP_PASS=cmtriztbjdsavlhw
```

> ⚠️ **`SMTP_PASS` must be a Google App Password, NOT your regular Gmail password.**
> Google blocks regular passwords for SMTP. App Passwords look like `abcd efgh ijkl mnop` (16 characters, no spaces when stored).

### How to Generate a New App Password (if needed)

1. Go to your [Google Account Security Settings](https://myaccount.google.com/security)
2. Make sure **2-Step Verification** is turned **ON**
3. Click into **2-Step Verification** → scroll to the bottom → click **App passwords**
4. Give it a name like `Ulap Corner SMTP` → click **Create**
5. Google shows a **16-character code** (e.g., `abcd efgh ijkl mnop`)
6. Open [`server/.env`](file:///f:/cyber-vape-main/server/.env) and paste it into `SMTP_PASS` **without spaces**:
   ```ini
   SMTP_PASS=abcdefghijklmnop
   ```
7. **Restart the server** for the new config to take effect

### Common SMTP Errors

| Error | Cause | Fix |
|---|---|---|
| `535 BadCredentials` | Wrong password or using regular Gmail password | Generate a new App Password |
| `ECONNREFUSED` | Can't reach Gmail SMTP | Check your internet / firewall |
| `EAUTH` | Gmail account has 2FA disabled | Enable 2-Step Verification first |
| `Connection timeout` | Port 465 blocked by network | Try `SMTP_PORT=587` and `SMTP_SECURE=false` |

### Fallback: Alternative Port Config (TLS instead of SSL)

If port 465 doesn't work on your network, edit `server/.env` to use port 587:

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ulapcorner@gmail.com
SMTP_PASS=your_app_password_here
```

---

## 🛠️ Troubleshooting

- **Port in Use:** If you see an `EADDRINUSE` error, it means another process is already using port 8000. Kill it with:
  ```powershell
  taskkill /IM node.exe /F
  ```
  Then start the server again.
- **PowerShell Script Errors:** If `npm start` gives a "running scripts is disabled" error, use `node server/index.js` directly.
- **OTP not arriving?** Check the server terminal for the OTP debug log — the code is always printed there even if email fails.

---

## 🌐 Production Server Deployment

When deploying to a real production server (Heroku, DigitalOcean, Render, VPS):

1. **Environment Variables**: Set all SMTP variables in the server's environment config or production `.env` file.
2. **Update the App URL**: The OTP verify page uses relative URLs (`/api/auth/...`) so no URL changes are needed. But for any absolute links, add an `APP_URL` variable:
   ```ini
   APP_URL=https://yourdomain.com
   ```
3. **Database Persistence**: Ensure `data.db` (SQLite) has write permissions and is on a persistent volume so data survives redeployments.
4. **Production Process Manager**: Run with `pm2` for auto-restart on crash:
   ```bash
   npm install pm2 -g
   pm2 start server/index.js --name "ulap-corner"
   pm2 save
   pm2 startup
   ```