.PHONY: dev build test clean mcp

dev:
	go run main.go

build:
	go build -o taskflow-server main.go

build-mcp:
	go build -o taskflow-mcp main.go

test:
	go test ./... -v

clean:
	rm -f taskflow-server taskflow-mcp taskflow.db

mcp:
	go run main.go --mcp --api-url http://localhost:8080 --token $(TOKEN)
