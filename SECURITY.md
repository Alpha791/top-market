Version: 1.0
Last Updated: June 2026
Applicable To: The Hive marketplace (web application), its users (buyers and sellers), and all integrated services (Firebase, Cloudinary, Vdo.ninja).

1. Purpose
The Hive is committed to protecting the privacy, security, and trust of its users. This Security Policy outlines the measures we take to safeguard user data, prevent unauthorised access, and ensure a safe trading environment for both buyers and sellers.

2. Data Protection
Firebase Authentication – All user credentials (email + password) are stored securely by Google Firebase. Passwords are hashed and salted; we never store plain‑text passwords.

Firestore Database – User profiles, listings, and orders are stored in Firestore with strict security rules. Only authenticated users can create or modify their own data.

Cloudinary – Product images are uploaded directly to Cloudinary. We do not store images on our own servers. Cloudinary provides secure, encrypted storage and delivery.

Local Storage – Cart data is stored locally in the user’s browser. No sensitive information (passwords, payment details) is ever stored in local storage.

No Payment Data – The Hive does not collect, store, or process any payment card details. All transactions are handled externally via WhatsApp (buyer‑seller communication).

3. Authentication & Authorization
Account Creation – Users must provide a valid email address and create a password. Optionally, they can choose their role (Buyer or Seller) during signup.

Role‑Based Access Control (RBAC) – Sellers have access to listing creation and live streaming; buyers have access to cart, ordering, and browsing. The system hides seller‑only features from buyers.

Session Management – Firebase handles session tokens automatically. Sessions expire after a reasonable period, and users are prompted to re‑authenticate.

Password Policy – We encourage strong passwords (minimum 6 characters, mixed case, numbers, and symbols) but do not enforce complexity beyond Firebase’s default policy.

4. Data Transmission
HTTPS Everywhere – The entire site is served over HTTPS via GitHub Pages. All communications between the client and Firebase, Cloudinary, and Vdo.ninja are encrypted using TLS 1.2 or higher.

API Keys – Firebase API keys are public by design (they only identify your project to Google services). We restrict API key usage to our domain via Google Cloud Console to prevent unauthorised use.

WhatsApp Links – All buyer‑seller communication occurs via WhatsApp using wa.me links. No sensitive data is transmitted through our servers; it goes directly from the buyer’s browser to WhatsApp’s secure infrastructure.

5. Content Moderation
User‑Generated Content – Listings, descriptions, and images are posted by users. The Hive does not pre‑moderate content but reserves the right to remove any listings that violate our terms of service (e.g., prohibited items, false information, offensive material).

Reporting Mechanism – Users can report suspicious or inappropriate listings by contacting us through the provided email or WhatsApp channel (currently under development).

Spam Prevention – We limit the number of listings a user can post per day (not yet enforced) and encourage users to use genuine contact details.

6. User Responsibilities
Secure Passwords – Users are responsible for choosing strong, unique passwords and keeping them confidential.

Personal Information – Users should not share sensitive personal information (ID numbers, bank details) within listing descriptions or chats.

Device Security – Users should ensure their devices are protected with up‑to‑date antivirus software and avoid using public or unsecured Wi‑Fi when accessing the site.

Account Recovery – Users must keep their registered email address accessible, as it is used for password reset and account recovery.

7. Vulnerability Reporting
If you discover a security vulnerability in The Hive, please report it responsibly:

Email: teverything@gmail.com

WhatsApp: +254791185252

Expectation: We will acknowledge your report within 48 hours, investigate, and provide a timeline for remediation. We do not offer bug bounties at this time but will credit reporters if they wish.

Please do not publicly disclose vulnerabilities until we have had a chance to address them.

8. Policy Updates
This Security Policy may be updated periodically. We will notify users of significant changes via a banner on the website or by email. The latest version will always be available in the SECURITY.md file in our GitHub repository.

9. Compliance
The Hive is committed to complying with applicable data protection laws, including the Kenya Data Protection Act (2019). We process personal data only for the purposes of providing our marketplace services and do not share user data with third parties except as necessary for the functioning of the platform (e.g., Cloudinary for image storage, Firebase for authentication).

Last Reviewed: June 2026
Next Review: December 2026

This Security Policy is a living document. If you have any questions or concerns, please contact us.
