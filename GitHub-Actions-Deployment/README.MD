# GitHub Actions Deployment Workflow

## 1. Overview

This project demonstrates how to automate the deployment of a static website using GitHub Actions and GitHub Pages.

The website is automatically deployed whenever changes to `index.html` are pushed to the `main` branch.

## 2. Objectives

- Understand the fundamentals of CI/CD.
- Create a GitHub Actions workflow using YAML.
- Configure automated deployment to GitHub Pages.
- Understand GitHub-hosted runners, jobs, steps, and artifacts.
- Implement path-based workflow triggers.

## 3. Project Structure

```text
roadmap-devops-project/
├── .github/
│   └── workflows/
│       └── deploy.yml
└── GitHub-Actions-Deployment/
    ├── index.html
    └── README.md
```

## 4. Technologies Used

| Technology | Purpose |
|---|---|
| Git | Version control |
| GitHub | Source code repository |
| GitHub Actions | CI/CD automation |
| GitHub Pages | Static website hosting |
| HTML | Website content |
| YAML | Workflow configuration |

## 5. Deployment Workflow

The workflow performs the following steps:

1. Detect changes to `index.html` on the `main` branch.
2. Start a GitHub-hosted Ubuntu runner.
3. Checkout the repository.
4. Configure GitHub Pages.
5. Upload the static website as a deployment artifact.
6. Deploy the artifact to GitHub Pages.

## 6. Workflow Configuration

The deployment workflow is located at:

`.github/workflows/deploy.yml`

The workflow uses the following GitHub Actions:

- `actions/checkout@v4`
- `actions/configure-pages@v5`
- `actions/upload-pages-artifact@v3`
- `actions/deploy-pages@v4`

## 7. Expected Result

After configuring GitHub Pages and successfully running the workflow, the static website should be accessible through a GitHub Pages URL.

Changes to `index.html` should trigger a new deployment automatically, while changes to the project README alone should not trigger the workflow.

## 8. Learning Outcomes

This project provides practical experience with GitHub Actions, CI/CD pipelines, deployment permissions, GitHub Pages artifacts, and automated static website deployment.

**Project Reference:** https://roadmap.sh/projects/github-actions-deployment-workflow