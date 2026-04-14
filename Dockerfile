# Build stage
FROM golang:1.25-alpine AS backend-builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app/server
COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ .
RUN CGO_ENABLED=1 go build -o /taskflow-server main.go
RUN CGO_ENABLED=1 go build -o /taskflow-mcp main.go

# Frontend build stage
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:web

# Final stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /taskflow-server /app/taskflow-server
COPY --from=backend-builder /taskflow-mcp /app/taskflow-mcp

# Copy frontend build
COPY --from=frontend-builder /app/dist-web /app/static

# Copy Makefile for convenience
COPY server/Makefile /app/Makefile

ENV PORT=8080
ENV DB_PATH=/data/taskflow.db
ENV JWT_SECRET=change-me-in-production

EXPOSE 8080

# Create data directory
RUN mkdir -p /data

VOLUME ["/data"]

CMD ["/app/taskflow-server"]
