# Project — GitHub Actions Deployment Workflow

## 1. Overview

This project demonstrates how to implement a Continuous Deployment (CD) pipeline using GitHub Actions and GitHub Pages.

A simple static HTML website is deployed automatically whenever changes to `index.html` are pushed to the `main` branch.

**Objectives:**
- Understand CI/CD fundamentals and GitHub Actions workflows.
- Configure automated deployment using YAML.
- Deploy a static website to GitHub Pages.
- Implement branch-based and path-based workflow triggers.
- Practice deployment verification and workflow monitoring.

## 2. Architecture

```text
Developer (Windows 11)
         |
         | Git Push (main)
         v
GitHub Repository
         |
         | Workflow Trigger
         v
GitHub Actions
(Ubuntu Runner)
         |
         | Checkout Repository
         | Configure GitHub Pages
         | Upload Pages Artifact
         | Deploy to GitHub Pages
         v
GitHub Pages
         |
         v
Static Website (HTML)
```

**Architecture Description:**

The developer modifies the website source code locally and pushes the changes to GitHub.

GitHub Actions detects changes to the specified files on the `main` branch and executes the deployment workflow using a GitHub-hosted Ubuntu runner.

The workflow packages the static website as an artifact and deploys it to GitHub Pages.

## 3. Technologies Used

| Technology | Purpose |
|---|---|
| Git | Version control |
| GitHub | Source code repository |
| GitHub Actions | CI/CD automation |
| GitHub Pages | Static website hosting |
| Ubuntu Runner | Workflow execution environment |
| HTML | Static website |
| YAML | Workflow configuration |

## 4. Project Structure

```text
roadmap-devops-project/
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── GitHub-Actions-Deployment/
│   ├── index.html
│   └── README.md
│
└── Other DevOps Projects/
```

**Note:** The workflow file is located in the root repository's `.github/workflows/` directory because GitHub Actions requires workflows to be defined at the repository level.

## 5. Workflow Configuration

**Workflow File:** `.github/workflows/deploy.yml`

### 5.1 Workflow Trigger

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'GitHub-Actions-Deployment/index.html'
      - '.github/workflows/deploy.yml'
```

The workflow is triggered when changes to the website or deployment workflow are pushed to `main`.

Changes to the README file alone do not trigger deployment.

### 5.2 Deployment Permissions

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

The workflow follows the Principle of Least Privilege by granting only the permissions required for deployment.

### 5.3 Deployment Steps

| Step | GitHub Action | Description |
|---|---|---|
| 1 | `actions/checkout@v4` | Retrieves repository source code |
| 2 | `actions/configure-pages@v5` | Configures GitHub Pages |
| 3 | `actions/upload-pages-artifact@v3` | Uploads the static website artifact |
| 4 | `actions/deploy-pages@v4` | Deploys the website to GitHub Pages |

The deployment artifact uses the following directory:

```yaml
with:
  path: 'GitHub-Actions-Deployment'
```

This ensures the workflow deploys the website files rather than the entire DevOps repository.

## 6. Deployment Configuration

GitHub Pages is configured using:

**Repository → Settings → Pages → Build and deployment → Source: GitHub Actions**

The workflow uses the `github-pages` environment and retrieves the deployment URL from the deployment step output.

## 7. Testing & Verification

### Test 01 — Initial Deployment

**Procedure:**
1. Commit the project files.
2. Push the changes to the `main` branch.
3. Open the GitHub repository's Actions tab.
4. Monitor the deployment workflow.
5. Access the published GitHub Pages website.

**Result:** PASS

- GitHub Actions workflow completed successfully.
- Static website was accessible through GitHub Pages.
- The website displayed the expected HTML content.

### Test 02 — Automatic Redeployment

**Procedure:**
1. Modify the content of `index.html`.
2. Update the website heading and deployment version.
3. Commit and push the changes to `main`.
4. Verify that GitHub Actions runs automatically.
5. Confirm that GitHub Pages displays the updated website.

**Status:** Pending verification.

### Test 03 — Path-Based Trigger

**Procedure:**
1. Modify only `GitHub-Actions-Deployment/README.md`.
2. Commit and push the changes.
3. Check the GitHub Actions tab.
4. Verify that no new deployment workflow is triggered.

**Expected Result:** README-only changes do not trigger deployment.

**Status:** Pending verification.

## 8. Learning Outcomes

Through this project, I practiced:

- Creating GitHub Actions workflows using YAML.
- Understanding jobs, steps, runners, and reusable actions.
- Configuring GitHub Actions permissions.
- Managing deployment artifacts.
- Deploying static websites through GitHub Pages.
- Implementing automated deployment triggers.
- Monitoring workflow execution and deployment results.
- Organizing GitHub Actions workflows in a monorepo.

## 9. References

- [Roadmap.sh — GitHub Actions Deployment Workflow](https://roadmap.sh/projects/github-actions-deployment-workflow)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)