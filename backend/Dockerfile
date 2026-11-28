# syntax=docker/dockerfile:1
FROM golang:1.27-alpine AS builder
WORKDIR /src
COPY go.mod ./
COPY backend ./backend
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /solar-calc ./backend

FROM alpine:3
RUN addgroup -g 1000 calc && adduser -D -H -u 1000 -G calc calc && mkdir -p /run/huongnang && chown calc:calc /run/huongnang
COPY --from=builder /solar-calc /usr/local/bin/solar-calc
USER calc
ENV SOL_CALC_SOCKET=/run/huongnang/calc.sock
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s CMD ["solar-calc","healthcheck"]
ENTRYPOINT ["solar-calc"]
