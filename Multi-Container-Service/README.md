\# Multi-Container Todo Service



A REST API built with Node.js, Express, and MongoDB, deployed using Docker Compose.



\## Architecture



\- \*\*API:\*\* Node.js + Express

\- \*\*Database:\*\* MongoDB

\- \*\*Container orchestration:\*\* Docker Compose

\- \*\*Data persistence:\*\* Docker named volume



\## Project Structure



```text

Multi-Container-Service/

├── api/

│   ├── src/

│   │   ├── index.js

│   │   └── todo.js

│   ├── Dockerfile

│   ├── package.json

│   └── package-lock.json

├── docker-compose.yml

└── README.md

```



\## Getting Started



\### Requirements

\- Docker

\- Docker Compose



\### Run the application



```bash

docker compose up -d --build

```



API available at:



```text

http://localhost:3000

```



Health check:



```text

GET /health

```



\## API Endpoints



| Method | Endpoint | Description |

|---|---|---|

| GET | `/health` | API health check |

| POST | `/todos` | Create a Todo |

| GET | `/todos` | Get all Todos |

| PATCH | `/todos/:id` | Update a Todo |

| DELETE | `/todos/:id` | Delete a Todo |



\## Example Requests



\### Create Todo



```json

{

&#x20; "title": "Learn Docker Compose"

}

```



\### Update Todo



```json

{

&#x20; "completed": true

}

```



\## Data Persistence



MongoDB data is stored in a Docker named volume:



```yaml

volumes:

&#x20; mongo-data:

```



The database persists across container recreation.



\## Useful Commands



```bash

\# Start services

docker compose up -d



\# Rebuild API

docker compose up -d --build api



\# View running containers

docker compose ps



\# View logs

docker compose logs -f



\# Stop containers without deleting database data

docker compose down



\# Stop containers and delete database data

docker compose down -v

```



\## Learning Objectives



\- Build a REST API with Express

\- Containerize an application with Docker

\- Run multiple containers using Docker Compose

\- Connect an API to MongoDB

\- Implement CRUD operations

\- Persist database data using Docker volumes

https://roadmap.sh/projects/multi-container-service
