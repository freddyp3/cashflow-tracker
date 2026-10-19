FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/worker ./cmd/worker

FROM alpine:3.20
RUN adduser -D -u 1000 worker && mkdir -p /state && chown worker:worker /state
COPY --from=build /out/worker /usr/local/bin/worker
USER worker
EXPOSE 8090
ENTRYPOINT ["worker"]
