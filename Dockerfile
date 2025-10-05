# Usa Go para compilar el binario
FROM golang:1.21 as builder

WORKDIR /app

# Copiar dependencias y descargar módulos
COPY go.mod go.sum ./
RUN go mod download

# Copiar el código fuente
COPY . .

# Construir binario estático
RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o monitor main.go

# Imagen final mínima
FROM debian:bookworm-slim

WORKDIR /app

# Copiar el binario y la carpeta estática
COPY --from=builder /app/monitor .
COPY --from=builder /app/static ./static

# Exponer puerto HTTP
EXPOSE 8080

# Ejecutar el monitor
CMD ["./monitor"]
