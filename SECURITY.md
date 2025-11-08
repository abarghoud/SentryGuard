# Security Policy

## Supported Versions

We take security seriously and aim to fix vulnerabilities as quickly as possible. Currently, we support the following versions:

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < latest| :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in SentryGuard, please report it responsibly by following these steps:

### How to Report

1. **Email**: Send details to [abarghoud@gmail.com] with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact and severity assessment
   - Any suggested fixes (if available)

2. **Encrypted Communication**: If you prefer encrypted communication, request our PGP key in your initial email.

3. **Expected Response Time**: We will acknowledge your email within 48 hours and provide a more detailed response within 7 days.

### What to Include

When reporting a vulnerability, please include:
- Type of issue (e.g., SQL injection, XSS, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact assessment

### What to Expect

After you submit a report:
1. **Confirmation**: We'll acknowledge receipt within 48 hours
2. **Assessment**: We'll investigate and assess the severity (typically 7-14 days)
3. **Updates**: We'll keep you informed of progress
4. **Fix**: We'll work on a fix and coordinate disclosure
5. **Credit**: With your permission, we'll publicly credit you for the discovery

## Security Best Practices

### For Developers

When contributing to SentryGuard:
- Never commit secrets, API keys, or tokens to the repository
- Use environment variables for all sensitive configuration
- Follow secure coding practices (input validation, output encoding, etc.)
- Keep dependencies up to date
- Run security linting tools before submitting PRs

### For Users

When deploying SentryGuard:
- **Use strong encryption keys**: Generate secure random keys for `ENCRYPTION_KEY`
- **Secure your database**: Use strong passwords and restrict network access
- **HTTPS only**: Always use HTTPS in production
- **Keep updated**: Regularly update to the latest version
- **Environment variables**: Never expose `.env` files publicly
- **Rate limiting**: Configure appropriate rate limits for your use case
- **Backup tokens**: Securely backup Tesla access tokens
- **Monitor logs**: Regularly check logs for suspicious activity

## Known Security Considerations

### Tesla API Tokens

- Tesla access tokens are encrypted at rest using AES-256
- Tokens are never logged or exposed in API responses
- Refresh tokens are used to maintain long-term access

### Telegram Bot

- Chat IDs are stored securely and associated with verified users
- Deep linking tokens expire after first use
- Bot commands require authenticated Telegram sessions

### Database Security

- Use strong PostgreSQL passwords
- Restrict database access to localhost or trusted networks
- Enable PostgreSQL SSL in production
- Regular backups with encrypted storage

### API Security

- Rate limiting is enforced (configurable via `THROTTLE_LIMIT`)
- JWT tokens for session management
- CORS configured to restrict access
- Input validation on all endpoints

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. Users will be notified through:
- GitHub Security Advisories
- Release notes
- README updates

## Responsible Disclosure

We follow a responsible disclosure policy:
1. Security issues are fixed privately
2. Fixes are released in a new version
3. Public disclosure occurs after users have had time to update (typically 7-14 days)
4. Credit is given to reporters who wish to be acknowledged

## Bug Bounty Program

Currently, we do not have a bug bounty program, but we greatly appreciate responsible security research and will acknowledge all valid reports.

## Contact

For security concerns, please contact: [abarghoud@gmail.com]

For general questions, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Additional Resources

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [Cloudflare Security Best Practices](https://www.cloudflare.com/learning/security/)
- [Tesla Fleet API Security](https://developer.tesla.com/docs/fleet-api#security)

---

Thank you for helping keep SentryGuard and its users safe!

