# NetShield Action

**GitHub Action for pre-merge secret scanning.**

---

## 🔎 What It Does

NetShield Action detects secrets in your repository **before code merges**:

- AWS, GCP, Azure keys
- SSH private keys
- API tokens & credentials
- Generic patterns for sensitive information

It blocks merges when secrets are found, providing clear PR comments.

---

## Usage

### Basic Workflow

```yaml
name: NetShield Secret Scan
on: [pull_request]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: NetShield-Enterprise/netshield-action@v1
        with:
          path: '.'
```
